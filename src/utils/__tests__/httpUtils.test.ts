import { describe, expect, it } from 'vitest';
import {
  applyHttpVariables,
  buildAuthHeaderEntries,
  createHttpRequestPayload,
  isValidJson,
} from '../httpUtils';

describe('httpUtils', () => {
  it('returns a stable JSON validation error instead of parser details', () => {
    const result = isValidJson('{"token":');

    expect(result).toEqual({ valid: false, error: 'invalidJson' });
    expect(result.error).not.toMatch(/Unexpected|position|unterminated/i);
  });

  it('treats empty request bodies as valid JSON payloads', () => {
    expect(isValidJson('')).toEqual({ valid: true });
    expect(isValidJson('   ')).toEqual({ valid: true });
  });

  it('applies environment variables to URLs, headers, and bodies', () => {
    const variables = [
      { key: 'baseUrl', value: 'https://api.example.com', enabled: true },
      { key: 'token', value: 'secret', enabled: true },
      { key: 'unused', value: 'x', enabled: false },
    ];

    expect(applyHttpVariables('{{baseUrl}}/users?token={{token}}&x={{unused}}', variables))
      .toBe('https://api.example.com/users?token=secret&x={{unused}}');
  });

  it('builds auth header entries for common auth modes', () => {
    expect(buildAuthHeaderEntries({ type: 'bearer', token: 'abc' })).toEqual([
      { key: 'Authorization', value: 'Bearer abc', enabled: true },
    ]);
    expect(buildAuthHeaderEntries({ type: 'apiKey', key: 'X-API-Key', value: '123' })).toEqual([
      { key: 'X-API-Key', value: '123', enabled: true },
    ]);
    expect(buildAuthHeaderEntries({ type: 'basic', username: 'user', password: 'pass' })[0].value)
      .toBe(`Basic ${btoa('user:pass')}`);
  });

  it('creates multipart payloads from enabled form rows', () => {
    const payload = createHttpRequestPayload({
      method: 'POST',
      bodyMode: 'formData',
      body: '{"ignored":true}',
      formRows: [
        { key: 'name', value: 'My Hub', enabled: true },
        { key: 'skip', value: 'x', enabled: false },
      ],
      headers: { 'Content-Type': 'application/json' },
    });

    expect(payload.body).toBeInstanceOf(FormData);
    expect((payload.body as FormData).get('name')).toBe('My Hub');
    expect(payload.headers).not.toHaveProperty('Content-Type');
  });
});
