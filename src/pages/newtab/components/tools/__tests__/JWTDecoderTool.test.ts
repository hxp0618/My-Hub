import { describe, expect, it } from 'vitest';
import { decodeJWT, parseJwtNumericDate } from '../JWTDecoderTool';

const encodePart = (value: Record<string, unknown>) => (
  Buffer.from(JSON.stringify(value), 'utf8').toString('base64url')
);

describe('decodeJWT', () => {
  it('decodes unpadded base64url JWT parts with unicode payload content', () => {
    const token = [
      encodePart({ alg: 'HS256', typ: 'JWT' }),
      encodePart({ name: '中文用户', exp: Math.floor(Date.now() / 1000) + 3600 }),
      'signature',
    ].join('.');

    const result = decodeJWT(token);

    expect(result.error).toBeNull();
    expect(result.header).toEqual({ alg: 'HS256', typ: 'JWT' });
    expect(result.payload).toMatchObject({ name: '中文用户' });
    expect(result.expiresAt).toBeInstanceOf(Date);
    expect(result.isExpired).toBe(false);
  });

  it('reports a stable error when a JWT part is not a JSON object', () => {
    const token = [
      Buffer.from(JSON.stringify(['not-object']), 'utf8').toString('base64url'),
      encodePart({ sub: '123' }),
      'signature',
    ].join('.');

    const result = decodeJWT(token);

    expect(result.header).toBeNull();
    expect(result.payload).toBeNull();
    expect(result.error).toBe('invalidJsonObject');
  });

  it('reports a stable error when a token does not have three parts', () => {
    const result = decodeJWT('header.payload');

    expect(result.header).toBeNull();
    expect(result.payload).toBeNull();
    expect(result.error).toBe('invalidFormat');
  });

  it('ignores exp values that cannot produce a valid date', () => {
    const token = [
      encodePart({ alg: 'HS256', typ: 'JWT' }),
      encodePart({ exp: 1e20 }),
      'signature',
    ].join('.');

    const result = decodeJWT(token);

    expect(result.error).toBeNull();
    expect(result.expiresAt).toBeNull();
    expect(result.isExpired).toBe(false);
  });

  it('parses only finite in-range NumericDate values', () => {
    expect(parseJwtNumericDate(0)?.toISOString()).toBe('1970-01-01T00:00:00.000Z');
    expect(parseJwtNumericDate(Number.NaN)).toBeNull();
    expect(parseJwtNumericDate(Number.POSITIVE_INFINITY)).toBeNull();
    expect(parseJwtNumericDate(1e20)).toBeNull();
    expect(parseJwtNumericDate('1710000000')).toBeNull();
  });
});
