import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ToolCard } from '../../../../components/ToolCard';
import { TOOL_METADATA, ToolId, ToolComponentProps } from '../../../../types/tools';
import { useCopyToClipboard } from '../../../../hooks/useCopyToClipboard';

export interface JWTDecodeResult {
  header: Record<string, unknown> | null;
  payload: Record<string, unknown> | null;
  signature: string;
  isExpired: boolean;
  expiresAt: Date | null;
  error: JWTDecodeErrorCode | null;
}

export type JWTDecodeErrorCode = 'invalidFormat' | 'invalidJsonObject' | 'decodeFailed';
export type JWTVerifyInput = { type: 'secret'; secret: string };

export interface JWTVerifyResult {
  valid: boolean;
  algorithm: string | null;
  error?: 'unsupportedAlgorithm' | 'missingSecret' | 'invalidToken' | 'verifyFailed';
}

export interface JsonWebKeyWithKid extends JsonWebKey {
  kid?: string;
  alg?: string;
}

const JWT_OBJECT_ERROR_CODE: JWTDecodeErrorCode = 'invalidJsonObject';
const MAX_VALID_DATE_MS = 8.64e15;

const decodeBase64UrlBytes = (value: string): Uint8Array => {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=');
  return Uint8Array.from(atob(padded), char => char.charCodeAt(0));
};

const decodeBase64Url = (value: string): string => {
  return new TextDecoder().decode(decodeBase64UrlBytes(value));
};

const parseJwtObject = (value: string): Record<string, unknown> => {
  const parsed: unknown = JSON.parse(decodeBase64Url(value));

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(JWT_OBJECT_ERROR_CODE);
  }

  return parsed as Record<string, unknown>;
};

export const parseJwtNumericDate = (value: unknown): Date | null => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;

  const timestampMs = value * 1000;
  if (!Number.isFinite(timestampMs) || Math.abs(timestampMs) > MAX_VALID_DATE_MS) {
    return null;
  }

  const date = new Date(timestampMs);
  return Number.isNaN(date.getTime()) ? null : date;
};

/**
 * 解码 JWT Token
 */
export const decodeJWT = (token: string): JWTDecodeResult => {
  const emptyResult: JWTDecodeResult = {
    header: null, payload: null, signature: '', isExpired: false, expiresAt: null, error: null,
  };

  if (!token.trim()) return emptyResult;

  const parts = token.split('.');
  if (parts.length !== 3) {
    return { ...emptyResult, error: 'invalidFormat' };
  }

  try {
    const header = parseJwtObject(parts[0]);
    const payload = parseJwtObject(parts[1]);
    const signature = parts[2];

    let isExpired = false;
    let expiresAt: Date | null = null;

    // JWT NumericDate 使用秒级时间戳；非法或超出 Date 范围的 exp 不参与过期判断。
    expiresAt = parseJwtNumericDate(payload.exp);
    if (expiresAt) {
      isExpired = expiresAt < new Date();
    }

    return { header, payload, signature, isExpired, expiresAt, error: null };
  } catch (e) {
    const error = (e as Error).message === JWT_OBJECT_ERROR_CODE ? JWT_OBJECT_ERROR_CODE : 'decodeFailed';
    return { ...emptyResult, error };
  }
};

const HMAC_ALGORITHM_HASH: Record<string, string> = {
  HS256: 'SHA-256',
  HS384: 'SHA-384',
  HS512: 'SHA-512',
};

export async function verifyJWTSignature(
  token: string,
  input: JWTVerifyInput
): Promise<JWTVerifyResult> {
  const parts = token.trim().split('.');
  if (parts.length !== 3) {
    return { valid: false, algorithm: null, error: 'invalidToken' };
  }

  let header: Record<string, unknown>;
  try {
    header = parseJwtObject(parts[0]);
  } catch {
    return { valid: false, algorithm: null, error: 'invalidToken' };
  }

  const algorithm = typeof header.alg === 'string' ? header.alg : null;
  const hash = algorithm ? HMAC_ALGORITHM_HASH[algorithm] : undefined;
  if (!algorithm || !hash) {
    return { valid: false, algorithm, error: 'unsupportedAlgorithm' };
  }

  if (!input.secret) {
    return { valid: false, algorithm, error: 'missingSecret' };
  }

  try {
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(input.secret),
      { name: 'HMAC', hash },
      false,
      ['verify'],
    );
    const signingInput = `${parts[0]}.${parts[1]}`;
    const signature = decodeBase64UrlBytes(parts[2]);
    const signatureBuffer = signature.buffer.slice(
      signature.byteOffset,
      signature.byteOffset + signature.byteLength,
    ) as ArrayBuffer;
    const valid = await crypto.subtle.verify(
      'HMAC',
      key,
      signatureBuffer,
      new TextEncoder().encode(signingInput),
    );

    return { valid, algorithm };
  } catch {
    return { valid: false, algorithm, error: 'verifyFailed' };
  }
}

export function resolveJwksUrlFromIssuer(issuer: string): string | null {
  const trimmed = issuer.trim();
  if (!trimmed) return null;

  try {
    const url = new URL(trimmed);
    url.pathname = `${url.pathname.replace(/\/+$/g, '')}/.well-known/jwks.json`;
    url.search = '';
    url.hash = '';
    return url.toString();
  } catch {
    return null;
  }
}

export async function fetchJwksKeyForToken(
  token: string,
  fetcher: (input: string) => Promise<Response> = fetch
): Promise<JsonWebKeyWithKid | null> {
  const result = decodeJWT(token);
  if (result.error || !result.header || !result.payload) return null;

  const issuer = typeof result.payload.iss === 'string' ? result.payload.iss : '';
  const kid = typeof result.header.kid === 'string' ? result.header.kid : '';
  const jwksUrl = resolveJwksUrlFromIssuer(issuer);
  if (!jwksUrl || !kid) return null;

  const response = await fetcher(jwksUrl);
  if (!response.ok) return null;

  const data: unknown = await response.json();
  if (!data || typeof data !== 'object' || !Array.isArray((data as { keys?: unknown }).keys)) {
    return null;
  }

  return ((data as { keys: JsonWebKeyWithKid[] }).keys)
    .find(key => key.kid === kid) ?? null;
}

export const JWTDecoderTool: React.FC<ToolComponentProps> = ({ isExpanded, onToggleExpand }) => {
  const { t } = useTranslation();
  const { copy } = useCopyToClipboard();
  const [token, setToken] = useState('');
  const [result, setResult] = useState<JWTDecodeResult>({
    header: null, payload: null, signature: '', isExpired: false, expiresAt: null, error: null,
  });
  const [secret, setSecret] = useState('');
  const [verifyResult, setVerifyResult] = useState<JWTVerifyResult | null>(null);
  const [jwksKey, setJwksKey] = useState<JsonWebKeyWithKid | null>(null);
  const [jwksLoading, setJwksLoading] = useState(false);

  useEffect(() => {
    setResult(decodeJWT(token));
  }, [token]);

  const handleClear = () => {
    setToken('');
    setSecret('');
    setVerifyResult(null);
    setJwksKey(null);
  };

  const handleVerify = async () => {
    setVerifyResult(await verifyJWTSignature(token, { type: 'secret', secret }));
  };

  const handleFetchJwks = async () => {
    setJwksLoading(true);
    try {
      setJwksKey(await fetchJwksKeyForToken(token));
    } finally {
      setJwksLoading(false);
    }
  };

  return (
    <ToolCard tool={TOOL_METADATA[ToolId.JWT_DECODER]} isExpanded={isExpanded} onToggleExpand={onToggleExpand}>
      <div className="h-full flex flex-col gap-4">
        <div className="flex-shrink-0">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium nb-text">{t('tools.jwtDecoder.input')}</label>
            <button onClick={handleClear} className="nb-btn nb-btn-ghost text-sm">
              {t('tools.jwtDecoder.clear')}
            </button>
          </div>
          <textarea
            value={token}
            onChange={e => setToken(e.target.value)}
            placeholder={t('tools.jwtDecoder.inputPlaceholder')}
            rows={3}
            className="nb-input w-full font-mono text-sm resize-none"
          />
        </div>

        {result.error && (
          <div className="p-3 nb-bg-card nb-border rounded-lg flex-shrink-0" style={{ borderColor: 'var(--nb-accent-pink)' }}>
            <p className="text-sm" style={{ color: 'var(--color-error-text)' }}>{t(`tools.jwtDecoder.errors.${result.error}`)}</p>
          </div>
        )}

        {result.expiresAt && (
          <div className="p-3 nb-bg-card nb-border rounded-lg flex-shrink-0" style={{ borderColor: result.isExpired ? 'var(--nb-accent-pink)' : 'var(--nb-accent-green)' }}>
            <p className="text-sm" style={{ color: result.isExpired ? 'var(--color-error-text)' : 'var(--nb-accent-green)' }}>
              {result.isExpired ? t('tools.jwtDecoder.expired') : t('tools.jwtDecoder.valid')} - {t('tools.jwtDecoder.expiresAt')}: {result.expiresAt.toLocaleString()}
            </p>
          </div>
        )}

        {result.header && (
          <div className="nb-card-static p-3 flex-shrink-0 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-2">
              <input
                type="password"
                value={secret}
                onChange={e => setSecret(e.target.value)}
                placeholder={t('tools.jwtDecoder.secretPlaceholder')}
                className="nb-input text-sm"
              />
              <button onClick={handleVerify} disabled={!token.trim()} className="nb-btn nb-btn-primary text-sm">
                {t('tools.jwtDecoder.verifySignature')}
              </button>
            </div>
            {verifyResult && (
              <p className={`text-sm ${verifyResult.valid ? 'text-[color:var(--nb-accent-green)]' : 'text-[color:var(--color-error-text)]'}`}>
                {verifyResult.valid
                  ? t('tools.jwtDecoder.signatureValid', { alg: verifyResult.algorithm })
                  : t(`tools.jwtDecoder.verifyErrors.${verifyResult.error ?? 'verifyFailed'}`, { alg: verifyResult.algorithm ?? '' })}
              </p>
            )}
            <div className="flex items-center gap-2">
              <button onClick={handleFetchJwks} disabled={!token.trim() || jwksLoading} className="nb-btn nb-btn-secondary text-sm">
                {jwksLoading ? t('common.loading') : t('tools.jwtDecoder.fetchJwks')}
              </button>
              {jwksKey && (
                <span className="text-xs nb-text-secondary truncate">
                  kid: {jwksKey.kid}
                </span>
              )}
            </div>
          </div>
        )}

        <div className="flex-1 grid grid-cols-2 gap-4 min-h-0">
          <div className="flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium nb-text">{t('tools.jwtDecoder.header')}</label>
              <button onClick={() => copy(JSON.stringify(result.header, null, 2))} disabled={!result.header}
                className="nb-btn nb-btn-ghost px-2 py-1 text-xs">
                {t('tools.jwtDecoder.copy')}
              </button>
            </div>
            <pre className="flex-1 p-3 nb-card-static overflow-auto text-xs font-mono nb-text">
              {result.header ? JSON.stringify(result.header, null, 2) : ''}
            </pre>
          </div>
          <div className="flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium nb-text">{t('tools.jwtDecoder.payload')}</label>
              <button onClick={() => copy(JSON.stringify(result.payload, null, 2))} disabled={!result.payload}
                className="nb-btn nb-btn-ghost px-2 py-1 text-xs">
                {t('tools.jwtDecoder.copy')}
              </button>
            </div>
            <pre className="flex-1 p-3 nb-card-static overflow-auto text-xs font-mono nb-text">
              {result.payload ? JSON.stringify(result.payload, null, 2) : ''}
            </pre>
          </div>
        </div>
      </div>
    </ToolCard>
  );
};
