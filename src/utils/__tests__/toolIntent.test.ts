import { describe, expect, it } from 'vitest';
import { ToolId } from '../../types/tools';
import {
  detectToolIntents,
  getToolIntentInvocationInput,
  runToolIntent,
  type ToolIntent,
} from '../toolIntent';

const firstIntent = (input: string): ToolIntent => {
  const [intent] = detectToolIntents(input);
  if (!intent) {
    throw new Error(`Expected at least one intent for ${input}`);
  }
  return intent;
};

describe('toolIntent', () => {
  it('detects valid JSON and formats it locally', () => {
    const intent = firstIntent('{"name":"My Hub","enabled":true}');

    expect(intent).toMatchObject({
      id: 'json-format',
      toolId: ToolId.JSON_FORMATTER,
      mode: 'format',
    });
    expect(runToolIntent(intent, '{"name":"My Hub","enabled":true}')).toEqual({
      success: true,
      output: '{\n  "name": "My Hub",\n  "enabled": true\n}',
    });
  });

  it('detects relaxed JSON that can be repaired', () => {
    const input = "{name:'My Hub', enabled:true,}";
    const intent = firstIntent(input);

    expect(intent).toMatchObject({
      id: 'json-repair',
      toolId: ToolId.JSON_FORMATTER,
      mode: 'repair',
    });
    expect(runToolIntent(intent, input)).toEqual({
      success: true,
      output: '{\n  "name": "My Hub",\n  "enabled": true\n}',
    });
  });

  it('detects percent-encoded text as a URL decode candidate', () => {
    const input = 'q=%E4%B8%AD%E6%96%87%20tools';
    const intent = firstIntent(input);

    expect(intent).toMatchObject({
      id: 'url-decode',
      toolId: ToolId.URL_CODEC,
      mode: 'decode',
    });
    expect(runToolIntent(intent, input)).toEqual({
      success: true,
      output: 'q=中文 tools',
    });
  });

  it('detects UTF-8 Base64 text conservatively', () => {
    const input = '5Lit5paH5YaF5a65';
    const intent = firstIntent(input);

    expect(intent).toMatchObject({
      id: 'base64-decode',
      toolId: ToolId.BASE64_CONVERTER,
      mode: 'decode',
    });
    expect(runToolIntent(intent, input)).toEqual({
      success: true,
      output: '中文内容',
    });
  });

  it('detects HTML entity encoded text', () => {
    const input = 'Tom &amp; Jerry &#123;';
    const intent = firstIntent(input);

    expect(intent).toMatchObject({
      id: 'html-entity-decode',
      toolId: ToolId.HTML_ENTITY,
      mode: 'decode',
    });
    expect(runToolIntent(intent, input)).toEqual({
      success: true,
      output: 'Tom & Jerry {',
    });
  });

  it('detects JWT tokens and previews decoded header and payload', () => {
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' }), 'utf8').toString('base64url');
    const payload = Buffer.from(JSON.stringify({ sub: '123' }), 'utf8').toString('base64url');
    const input = `${header}.${payload}.signature`;
    const intent = firstIntent(input);

    expect(intent).toMatchObject({
      id: 'jwt-decode',
      toolId: ToolId.JWT_DECODER,
      mode: 'decode',
    });
    const result = runToolIntent(intent, input);
    expect(result.success).toBe(true);
    if (!result.success) throw new Error('Expected JWT preview to succeed');

    expect(JSON.parse(result.output)).toEqual({
      header: { alg: 'HS256', typ: 'JWT' },
      payload: { sub: '123' },
    });
  });

  it('does not create high-confidence suggestions for ordinary short text', () => {
    expect(detectToolIntents('hello world')).toEqual([]);
  });

  it('detects timestamps and previews the converted date', () => {
    const intent = firstIntent('1704067200');
    expect(intent).toMatchObject({ id: 'timestamp-to-date', toolId: ToolId.TIMESTAMP_CONVERTER });
    const result = runToolIntent(intent, '1704067200');
    expect(result.success).toBe(true);
    if (result.success) expect(result.output).toContain('2024-01-01T00:00:00.000Z');
  });

  it('detects YAML and TOML configuration', () => {
    expect(firstIntent('name: My Hub\nenabled: true')).toMatchObject({
      id: 'yaml-convert',
      toolId: ToolId.YAML_TOML_CONVERTER,
    });
    expect(firstIntent('[app]\nname = "My Hub"')).toMatchObject({
      id: 'toml-convert',
      toolId: ToolId.YAML_TOML_CONVERTER,
    });
  });

  it('detects regex literals and strips delimiters for tool invocation', () => {
    const input = '/my\\s+hub/gi';
    const intent = firstIntent(input);
    expect(intent).toMatchObject({ id: 'regex-test', mode: 'regex:gi', toolId: ToolId.REGEX_TESTER });
    expect(getToolIntentInvocationInput(intent, input)).toBe('my\\s+hub');
  });

  it('detects explicit hash and case conversion commands', () => {
    const hashInput = 'sha256: My Hub';
    const hashIntent = firstIntent(hashInput);
    expect(hashIntent).toMatchObject({ id: 'hash-calculate', mode: 'SHA256', toolId: ToolId.HASH_CALCULATOR });
    expect(getToolIntentInvocationInput(hashIntent, hashInput)).toBe('My Hub');
    expect(runToolIntent(hashIntent, hashInput)).toEqual({
      success: true,
      output: 'a4d17955a117d4068ab54bdf1cb46f20d4fd91f0094afe78e5b542ef9d6ba43f',
    });

    const caseInput = 'snake: MyHub command palette';
    const caseIntent = firstIntent(caseInput);
    expect(caseIntent).toMatchObject({ id: 'case-convert', mode: 'snakeCase', toolId: ToolId.CASE_CONVERTER });
    expect(runToolIntent(caseIntent, caseInput)).toEqual({ success: true, output: 'my_hub_command_palette' });
  });

  it('supports explicit encode commands without guessing ordinary text', () => {
    const urlInput = 'url encode: 中文 tools';
    const urlIntent = firstIntent(urlInput);
    expect(urlIntent).toMatchObject({ id: 'url-encode', mode: 'encode', toolId: ToolId.URL_CODEC });
    expect(getToolIntentInvocationInput(urlIntent, urlInput)).toBe('中文 tools');
    expect(runToolIntent(urlIntent, urlInput)).toEqual({ success: true, output: '%E4%B8%AD%E6%96%87%20tools' });

    const base64Input = 'base64 encode: 中文';
    const base64Intent = firstIntent(base64Input);
    expect(base64Intent).toMatchObject({ id: 'base64-encode', toolId: ToolId.BASE64_CONVERTER });
    expect(runToolIntent(base64Intent, base64Input)).toEqual({ success: true, output: '5Lit5paH' });

    const htmlInput = 'html encode: <strong>My Hub</strong>';
    const htmlIntent = firstIntent(htmlInput);
    expect(htmlIntent).toMatchObject({ id: 'html-entity-encode', toolId: ToolId.HTML_ENTITY });
    expect(runToolIntent(htmlIntent, htmlInput)).toEqual({
      success: true,
      output: '&lt;strong&gt;My Hub&lt;/strong&gt;',
    });
  });

  it('recognizes colors and opens the color converter', () => {
    const intent = firstIntent('#3b82f6');
    expect(intent).toMatchObject({ id: 'color-convert', toolId: ToolId.COLOR_CONVERTER });
    expect(runToolIntent(intent, '#3b82f6')).toEqual({
      success: true,
      output: '#3b82f6\nrgb(59, 130, 246)',
    });
  });

  it('recognizes UUID, NanoID, random string, and random number commands', () => {
    const uuidInput = 'uuid v4';
    const uuidIntent = firstIntent(uuidInput);
    expect(uuidIntent).toMatchObject({ id: 'uuid-generate', mode: 'uuid-v4', toolId: ToolId.RANDOM_GENERATOR });
    const uuidResult = runToolIntent(uuidIntent, uuidInput);
    expect(uuidResult.success).toBe(true);
    if (uuidResult.success) expect(uuidResult.output).toMatch(/^[0-9a-f-]{36}$/);

    const nanoidIntent = firstIntent('nanoid 12');
    const nanoidResult = runToolIntent(nanoidIntent, 'nanoid 12');
    expect(nanoidIntent).toMatchObject({ id: 'nanoid-generate', mode: 'nanoid' });
    if (nanoidResult.success) expect(nanoidResult.output).toHaveLength(12);

    expect(firstIntent('random string 24')).toMatchObject({ id: 'random-string', mode: 'string' });
    const numberIntent = firstIntent('random number 7..7');
    expect(runToolIntent(numberIntent, 'random number 7..7')).toEqual({ success: true, output: '7' });
  });

  it('recognizes Cron expressions and previews upcoming executions', () => {
    const input = '0 9 * * 1';
    const intent = firstIntent(input);
    expect(intent).toMatchObject({ id: 'cron-inspect', toolId: ToolId.CRON_BUILDER });
    const result = runToolIntent(intent, input);
    expect(result.success).toBe(true);
    if (result.success) expect(result.output).toContain(input);
  });

  it('recognizes cURL commands and plain HTTP URLs', () => {
    const curlInput = "curl -X POST 'https://api.example.com/items' -H 'Content-Type: application/json' -d '{\"name\":\"My Hub\"}'";
    const curlIntent = firstIntent(curlInput);
    expect(curlIntent).toMatchObject({ id: 'curl-import', mode: 'curl', toolId: ToolId.HTTP_URL_TESTER });
    const curlResult = runToolIntent(curlIntent, curlInput);
    expect(curlResult.success).toBe(true);
    if (curlResult.success) expect(curlResult.output).toContain('POST https://api.example.com/items');

    const urlIntent = firstIntent('https://example.com/api?healthy=true');
    expect(urlIntent).toMatchObject({ id: 'http-request', mode: 'url', toolId: ToolId.HTTP_URL_TESTER });
  });
});
