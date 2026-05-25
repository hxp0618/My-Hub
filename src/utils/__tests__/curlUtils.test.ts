import { describe, expect, it } from 'vitest';
import { generateCurl, parseCurl } from '../curlUtils';

describe('curl utilities', () => {
  it('parses a curl command into request fields', () => {
    expect(parseCurl("curl 'https://api.example.com/users' -H 'Content-Type: application/json' -d '{\"name\":\"test\"}'")).toEqual({
      success: true,
      data: {
        url: 'https://api.example.com/users',
        method: 'POST',
        headers: [{ key: 'Content-Type', value: 'application/json', enabled: true }],
        body: '{"name":"test"}',
      },
    });
  });

  it('returns stable error codes for user-visible validation messages', () => {
    expect(parseCurl('')).toEqual({ success: false, error: 'emptyCommand' });
    expect(parseCurl('wget https://example.com')).toEqual({ success: false, error: 'missingCurlPrefix' });
    expect(parseCurl('curl -X PATCHY https://example.com')).toEqual({
      success: false,
      error: 'unsupportedMethod',
      values: {
        method: 'PATCHY',
        supportedMethods: 'GET, POST, PUT, DELETE, PATCH',
      },
    });
    expect(parseCurl('curl -X GET')).toEqual({ success: false, error: 'missingUrl' });
  });

  it('generates shell-safe curl commands', () => {
    const command = generateCurl({
      url: 'https://api.example.com/users',
      method: 'POST',
      headers: [{ key: 'X-Name', value: "it's ok", enabled: true }],
      body: '{"name":"test"}',
    });

    expect(command).toBe("curl -X POST 'https://api.example.com/users' -H 'X-Name: it'\\''s ok' -d '{\"name\":\"test\"}'");
  });
});
