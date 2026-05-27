import { afterEach, describe, expect, it, vi } from 'vitest';
import { LLMSettings } from '../../types/llm';
import { LLMConnectionError, testLLMConnection } from '../llmUtils';

const createSettings = (overrides: Partial<LLMSettings> = {}): LLMSettings => ({
  selectedProvider: 'custom',
  selectedModel: 'custom',
  apiKey: 'test-key',
  customApiUrl: 'https://api.example.com/v1/chat/completions',
  customModel: 'test-model',
  providers: {},
  prioritizeGeminiNano: false,
  ...overrides,
});

describe('testLLMConnection', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('throws stable validation error codes instead of localized messages', async () => {
    await expect(testLLMConnection(createSettings({ selectedProvider: 'missing' }))).rejects.toMatchObject({
      code: 'invalidProvider',
    });
    await expect(testLLMConnection(createSettings({ customApiUrl: '' }))).rejects.toMatchObject({
      code: 'emptyApiUrl',
    });
    await expect(testLLMConnection(createSettings({ apiKey: '' }))).rejects.toMatchObject({
      code: 'emptyApiKey',
    });
    await expect(testLLMConnection(createSettings({ customModel: '' }))).rejects.toMatchObject({
      code: 'emptyModel',
    });
  });

  it('wraps failed HTTP responses with status and truncated details', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      text: async () => ` ${'rate limit '.repeat(30)} `,
    }));

    await expect(testLLMConnection(createSettings())).rejects.toMatchObject({
      code: 'apiRequestFailed',
      status: 429,
      details: expect.stringMatching(/^rate limit/),
    });

    try {
      await testLLMConnection(createSettings());
    } catch (error) {
      expect(error).toBeInstanceOf(LLMConnectionError);
      expect((error as LLMConnectionError).details?.length).toBeLessThanOrEqual(160);
    }
  });

  it('throws stable error codes for invalid responses and network failures', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [] }),
    }));

    await expect(testLLMConnection(createSettings())).rejects.toMatchObject({
      code: 'invalidResponse',
    });

    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('fetch failed')));

    await expect(testLLMConnection(createSettings())).rejects.toMatchObject({
      code: 'networkError',
    });
  });
});
