import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LLMServiceError, parseSseChunk, sendMessage } from '../llmService';
import { StorageKey } from '../../utils/storageManager';

const delta = (content: string) => (
  `data: ${JSON.stringify({ choices: [{ delta: { content } }] })}\n`
);

describe('llmService SSE parsing', () => {
  it('buffers partial SSE data lines across chunks', () => {
    const first = parseSseChunk('data: {"choices":[{"delta":{"content":"Hel');
    expect(first.contents).toEqual([]);
    expect(first.done).toBe(false);
    expect(first.buffer).toBe('data: {"choices":[{"delta":{"content":"Hel');

    const second = parseSseChunk('lo"}}]}\n', first.buffer);
    expect(second.contents).toEqual(['Hello']);
    expect(second.buffer).toBe('');
  });

  it('parses complete data lines and done markers', () => {
    const result = parseSseChunk(`${delta('A')}${delta('B')}data: [DONE]\n`);

    expect(result.contents).toEqual(['A', 'B']);
    expect(result.done).toBe(true);
    expect(result.buffer).toBe('');
  });

  it('flushes a final unterminated SSE line', () => {
    const result = parseSseChunk(delta('Final').trimEnd(), '', true);

    expect(result.contents).toEqual(['Final']);
    expect(result.buffer).toBe('');
  });

  it('reports invalid complete payloads without dropping buffered partial data', () => {
    const result = parseSseChunk('data: {bad-json}\ndata: {"choices"');

    expect(result.invalidPayloads).toEqual(['{bad-json}']);
    expect(result.contents).toEqual([]);
    expect(result.buffer).toBe('data: {"choices"');
  });
});

describe('llmService request errors', () => {
  beforeEach(() => {
    vi.spyOn(console, 'info').mockImplementation(() => undefined);
    vi.spyOn(console, 'debug').mockImplementation(() => undefined);
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    localStorage.setItem(StorageKey.LLM_SETTINGS, JSON.stringify({
      prioritizeGeminiNano: false,
      selectedProvider: 'custom',
      selectedModel: 'gpt-test',
      apiKey: 'test-key',
      customApiUrl: 'https://llm.example.com/chat',
      customModel: '',
      providers: {},
    }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it('does not expose provider response bodies on HTTP failures', async () => {
    const onError = vi.fn();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => 'raw provider secret stack trace',
    }));

    await sendMessage(
      [{ role: 'user', content: 'hello' }],
      { onUpdate: vi.fn(), onFinish: vi.fn(), onError },
      undefined,
      { stream: false }
    );

    const error = onError.mock.calls[0][0] as LLMServiceError;
    expect(error).toBeInstanceOf(LLMServiceError);
    expect(error.code).toBe('apiRequestFailed');
    expect(error.status).toBe(500);
    expect(error.message).not.toContain('raw provider secret stack trace');
  });

  it('uses a stable stream error when response body is missing', async () => {
    const onError = vi.fn();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      body: null,
    }));

    await sendMessage(
      [{ role: 'user', content: 'hello' }],
      { onUpdate: vi.fn(), onFinish: vi.fn(), onError },
      undefined,
      { stream: true }
    );

    const error = onError.mock.calls[0][0] as LLMServiceError;
    expect(error.code).toBe('streamUnavailable');
    expect(error.message).not.toContain('Response body is null');
  });

  it('maps fetch failures to a stable network error', async () => {
    const onError = vi.fn();
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch raw host detail')));

    await sendMessage(
      [{ role: 'user', content: 'hello' }],
      { onUpdate: vi.fn(), onFinish: vi.fn(), onError },
      undefined,
      { stream: false }
    );

    const error = onError.mock.calls[0][0] as LLMServiceError;
    expect(error.code).toBe('networkError');
    expect(error.message).not.toContain('raw host detail');
  });

  it('blocks unconfigured AI requests before fetch and emits setup guidance', async () => {
    localStorage.clear();
    const fetchMock = vi.fn();
    const onError = vi.fn();
    const eventListener = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    window.addEventListener('myhub:ai-configuration-required', eventListener);

    await sendMessage(
      [{ role: 'user', content: 'hello' }],
      { onUpdate: vi.fn(), onFinish: vi.fn(), onError },
      undefined,
      { stream: false }
    );

    expect(fetchMock).not.toHaveBeenCalled();
    expect(eventListener).toHaveBeenCalledTimes(1);
    expect((onError.mock.calls[0][0] as LLMServiceError).code).toBe('configurationRequired');
    window.removeEventListener('myhub:ai-configuration-required', eventListener);
  });
});
