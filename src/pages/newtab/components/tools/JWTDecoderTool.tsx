import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ToolCard } from '../../../../components/ToolCard';
import { TOOL_METADATA, ToolId, ToolComponentProps } from '../../../../types/tools';
import { useCopyToClipboard } from '../../../../hooks/useCopyToClipboard';

export interface JWTDecodeResult {
  header: object | null;
  payload: object | null;
  signature: string;
  isExpired: boolean;
  expiresAt: Date | null;
  error: string | null;
}

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
    return { ...emptyResult, error: 'Invalid JWT format: expected 3 parts' };
  }

  try {
    const header = JSON.parse(atob(parts[0].replace(/-/g, '+').replace(/_/g, '/')));
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    const signature = parts[2];

    let isExpired = false;
    let expiresAt: Date | null = null;

    if (payload.exp) {
      expiresAt = new Date(payload.exp * 1000);
      isExpired = expiresAt < new Date();
    }

    return { header, payload, signature, isExpired, expiresAt, error: null };
  } catch (e) {
    return { ...emptyResult, error: 'Failed to decode JWT: ' + (e as Error).message };
  }
};

export const JWTDecoderTool: React.FC<ToolComponentProps> = ({ isExpanded, onToggleExpand }) => {
  const { t } = useTranslation();
  const { copy } = useCopyToClipboard();
  const [token, setToken] = useState('');
  const [result, setResult] = useState<JWTDecodeResult>({
    header: null, payload: null, signature: '', isExpired: false, expiresAt: null, error: null,
  });

  useEffect(() => {
    setResult(decodeJWT(token));
  }, [token]);

  const handleClear = () => {
    setToken('');
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
            <p className="text-sm" style={{ color: 'var(--nb-accent-pink)' }}>{result.error}</p>
          </div>
        )}

        {result.expiresAt && (
          <div className="p-3 nb-bg-card nb-border rounded-lg flex-shrink-0" style={{ borderColor: result.isExpired ? 'var(--nb-accent-pink)' : 'var(--nb-accent-green)' }}>
            <p className="text-sm" style={{ color: result.isExpired ? 'var(--nb-accent-pink)' : 'var(--nb-accent-green)' }}>
              {result.isExpired ? t('tools.jwtDecoder.expired') : t('tools.jwtDecoder.valid')} - {t('tools.jwtDecoder.expiresAt')}: {result.expiresAt.toLocaleString()}
            </p>
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
