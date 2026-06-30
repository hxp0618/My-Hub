/**
 * @vitest-environment node
 */
import { describe, expect, it } from 'vitest';
import {
  decodeJWT,
  fetchJwksKeyForToken,
  parseJwtNumericDate,
  resolveJwksUrlFromIssuer,
  verifyJWTSignature,
} from '../JWTDecoderTool';

const encodePart = (value: Record<string, unknown>) => (
  Buffer.from(JSON.stringify(value), 'utf8').toString('base64url')
);

const encodeBase64Url = (bytes: Uint8Array): string => (
  Buffer.from(bytes).toString('base64url')
);

async function createHs256Token(secret: string): Promise<string> {
  const signingInput = [
    encodePart({ alg: 'HS256', typ: 'JWT' }),
    encodePart({ sub: '123' }),
  ].join('.');
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = new Uint8Array(await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(signingInput),
  ));

  return `${signingInput}.${encodeBase64Url(signature)}`;
}

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

  it('verifies HS256 signatures with a shared secret', async () => {
    const token = await createHs256Token('secret');

    await expect(verifyJWTSignature(token, { type: 'secret', secret: 'secret' }))
      .resolves.toEqual({ valid: true, algorithm: 'HS256' });
    await expect(verifyJWTSignature(token, { type: 'secret', secret: 'wrong' }))
      .resolves.toMatchObject({ valid: false, algorithm: 'HS256' });
  });

  it('resolves and fetches a JWKS key by issuer and kid', async () => {
    const token = [
      encodePart({ alg: 'RS256', kid: 'key-1' }),
      encodePart({ iss: 'https://issuer.example.com/' }),
      'signature',
    ].join('.');
    const fetcher = async (_input: string) => new Response(JSON.stringify({
      keys: [
        { kty: 'RSA', kid: 'key-1', alg: 'RS256', n: 'abc', e: 'AQAB' },
      ],
    }), { status: 200, headers: { 'content-type': 'application/json' } });

    expect(resolveJwksUrlFromIssuer('https://issuer.example.com/'))
      .toBe('https://issuer.example.com/.well-known/jwks.json');
    await expect(fetchJwksKeyForToken(token, fetcher))
      .resolves.toMatchObject({ kid: 'key-1', alg: 'RS256' });
  });
});
