import { describe, expect, it } from 'vitest';
import { decodeBase64, encodeBase64 } from '../Base64ConverterTool';

describe('Base64ConverterTool codec', () => {
  it('round-trips multilingual Unicode text', () => {
    const text = '中文、emoji 😀、accent é and symbols ✓';

    expect(decodeBase64(encodeBase64(text))).toBe(text);
  });

  it('matches standard UTF-8 base64 output', () => {
    expect(encodeBase64('hello')).toBe('aGVsbG8=');
    expect(encodeBase64('你好')).toBe('5L2g5aW9');
  });

  it('rejects malformed UTF-8 bytes instead of returning replacement text', () => {
    expect(() => decodeBase64('/w==')).toThrow();
  });
});
