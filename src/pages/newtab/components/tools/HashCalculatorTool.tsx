import React, { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ToolCard } from '../../../../components/ToolCard';
import { TOOL_METADATA, ToolId, ToolComponentProps } from '../../../../types/tools';
import { useCopyToClipboard } from '../../../../hooks/useCopyToClipboard';
import CryptoJS from 'crypto-js';
import { useToolInvocation } from '../../../../hooks/useToolInvocation';

export type HashAlgorithm = 'MD5' | 'SHA1' | 'SHA256' | 'SHA512';
type HashMode = 'text' | 'hmac' | 'file';
type HashInput = string | CryptoJS.lib.WordArray;

// 哈希输出长度映射
export const HASH_LENGTHS: Record<HashAlgorithm, number> = {
  MD5: 32,
  SHA1: 40,
  SHA256: 64,
  SHA512: 128,
};

/**
 * 计算哈希值
 */
const calculateHashValue = (input: HashInput, algorithm: HashAlgorithm): string => {
  switch (algorithm) {
    case 'MD5':
      return CryptoJS.MD5(input).toString();
    case 'SHA1':
      return CryptoJS.SHA1(input).toString();
    case 'SHA256':
      return CryptoJS.SHA256(input).toString();
    case 'SHA512':
      return CryptoJS.SHA512(input).toString();
    default:
      return '';
  }
};

export const calculateHash = (input: string, algorithm: HashAlgorithm): string => {
  return calculateHashValue(input, algorithm);
};

export const calculateHmac = (input: string, secret: string, algorithm: HashAlgorithm): string => {
  switch (algorithm) {
    case 'MD5':
      return CryptoJS.HmacMD5(input, secret).toString();
    case 'SHA1':
      return CryptoJS.HmacSHA1(input, secret).toString();
    case 'SHA256':
      return CryptoJS.HmacSHA256(input, secret).toString();
    case 'SHA512':
      return CryptoJS.HmacSHA512(input, secret).toString();
    default:
      return '';
  }
};

const readFileAsArrayBuffer = (file: File): Promise<ArrayBuffer> => {
  if (typeof file.arrayBuffer === 'function') {
    return file.arrayBuffer();
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result instanceof ArrayBuffer) {
        resolve(reader.result);
        return;
      }
      reject(new Error('Unexpected file reader result'));
    };
    reader.onerror = () => reject(reader.error ?? new Error('File read failed'));
    reader.readAsArrayBuffer(file);
  });
};

export const calculateFileHash = async (file: File, algorithm: HashAlgorithm): Promise<string> => {
  const buffer = await readFileAsArrayBuffer(file);
  const wordArray = CryptoJS.lib.WordArray.create(buffer);
  return calculateHashValue(wordArray, algorithm);
};

/**
 * 哈希计算器工具组件
 */
export const HashCalculatorTool: React.FC<ToolComponentProps> = ({
  isExpanded,
  onToggleExpand,
  invocation,
  onInvocationHandled,
}) => {
  const { t } = useTranslation();
  const { copy } = useCopyToClipboard();
  const [mode, setMode] = useState<HashMode>('text');
  const [input, setInput] = useState('');
  const [secret, setSecret] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [algorithm, setAlgorithm] = useState<HashAlgorithm>('SHA256');
  const [uppercase, setUppercase] = useState(false);
  const [result, setResult] = useState('');
  const [fileError, setFileError] = useState('');

  const applyInvocation = useCallback((nextInvocation: NonNullable<ToolComponentProps['invocation']>) => {
    const nextAlgorithm = nextInvocation.mode;
    if (nextAlgorithm === 'MD5' || nextAlgorithm === 'SHA1' || nextAlgorithm === 'SHA256' || nextAlgorithm === 'SHA512') {
      setAlgorithm(nextAlgorithm);
    }
    setMode('text');
    setInput(nextInvocation.input);
  }, []);

  useToolInvocation({
    invocation,
    targetToolId: ToolId.HASH_CALCULATOR,
    onInvocationHandled,
    onApply: applyInvocation,
  });

  // 实时计算哈希
  useEffect(() => {
    let cancelled = false;
    const formatResult = (hash: string) => (uppercase ? hash.toUpperCase() : hash.toLowerCase());

    if (mode === 'text') {
      if (!input) {
        setResult('');
        return;
      }
      setResult(formatResult(calculateHash(input, algorithm)));
      return;
    }

    if (mode === 'hmac') {
      if (!input || !secret) {
        setResult('');
        return;
      }
      setResult(formatResult(calculateHmac(input, secret, algorithm)));
      return;
    }

    if (!selectedFile) {
      setResult('');
      setFileError('');
      return;
    }

    calculateFileHash(selectedFile, algorithm)
      .then(hash => {
        if (!cancelled) {
          setResult(formatResult(hash));
          setFileError('');
        }
      })
      .catch(() => {
        if (!cancelled) {
          setResult('');
          setFileError(t('tools.hashCalculator.fileReadError'));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [algorithm, input, mode, secret, selectedFile, t, uppercase]);

  const handleCopy = useCallback(() => {
    copy(result);
  }, [result, copy]);

  const handleClear = () => {
    setInput('');
    setSecret('');
    setSelectedFile(null);
    setResult('');
    setFileError('');
  };

  return (
    <ToolCard
      tool={TOOL_METADATA[ToolId.HASH_CALCULATOR]}
      isExpanded={isExpanded}
      onToggleExpand={onToggleExpand}
    >
      <div className="h-full flex flex-col gap-4">
        {/* 控制区 */}
        <div className="flex items-center gap-4 flex-wrap flex-shrink-0">
          <div className="flex items-center gap-2">
            <label className="text-sm nb-text-secondary">
              {t('tools.hashCalculator.mode')}:
            </label>
            <select
              value={mode}
              onChange={e => setMode(e.target.value as HashMode)}
              className="nb-input text-sm"
            >
              <option value="text">{t('tools.hashCalculator.modes.text')}</option>
              <option value="hmac">{t('tools.hashCalculator.modes.hmac')}</option>
              <option value="file">{t('tools.hashCalculator.modes.file')}</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm nb-text-secondary">
              {t('tools.hashCalculator.algorithm')}:
            </label>
            <select
              value={algorithm}
              onChange={e => setAlgorithm(e.target.value as HashAlgorithm)}
              className="nb-input text-sm"
            >
              <option value="MD5">MD5</option>
              <option value="SHA1">SHA-1</option>
              <option value="SHA256">SHA-256</option>
              <option value="SHA512">SHA-512</option>
            </select>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={uppercase}
              onChange={e => setUppercase(e.target.checked)}
              className="w-4 h-4 rounded nb-border accent-[var(--nb-accent-yellow)]"
            />
            <span className="text-sm nb-text-secondary">
              {t('tools.hashCalculator.uppercase')}
            </span>
          </label>

          <div className="flex gap-2 ml-auto">
            <button
              onClick={handleCopy}
              disabled={!result}
              className="nb-btn nb-btn-secondary text-sm"
            >
              {t('tools.hashCalculator.copy')}
            </button>
            <button
              onClick={handleClear}
              className="nb-btn nb-btn-ghost text-sm"
            >
              {t('tools.hashCalculator.clear')}
            </button>
          </div>
        </div>

        {/* 输入输出区域 */}
        <div className="flex-1 grid grid-cols-2 gap-4 min-h-0">
          {/* 输入区 */}
          <div className="flex flex-col min-h-0">
            <label className="block text-sm font-medium nb-text mb-2 flex-shrink-0">
              {mode === 'file' ? t('tools.hashCalculator.file') : t('tools.hashCalculator.input')}
            </label>
            {mode === 'file' ? (
              <div className="flex-1 flex flex-col gap-3">
                <input
                  type="file"
                  onChange={e => setSelectedFile(e.target.files?.[0] ?? null)}
                  className="nb-input text-sm"
                />
                <div className="px-3 py-2 nb-bg nb-border rounded-lg text-sm nb-text-secondary">
                  {selectedFile
                    ? t('tools.hashCalculator.fileName', { name: selectedFile.name })
                    : t('tools.hashCalculator.filePlaceholder')}
                </div>
                {fileError && (
                  <div className="px-3 py-2 nb-bg-card nb-border rounded-lg text-sm" style={{ color: 'var(--color-error-text)', borderColor: 'var(--nb-accent-pink)' }}>
                    {fileError}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex-1 flex flex-col gap-3 min-h-0">
                <textarea
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  placeholder={t('tools.hashCalculator.inputPlaceholder')}
                  className="nb-input flex-1 font-mono text-sm resize-none"
                />
                {mode === 'hmac' && (
                  <input
                    type="password"
                    value={secret}
                    onChange={e => setSecret(e.target.value)}
                    placeholder={t('tools.hashCalculator.secretPlaceholder')}
                    aria-label={t('tools.hashCalculator.secret')}
                    className="nb-input font-mono text-sm"
                  />
                )}
              </div>
            )}
          </div>

          {/* 输出区 */}
          <div className="flex flex-col min-h-0">
            <label className="block text-sm font-medium nb-text mb-2 flex-shrink-0">
              {t('tools.hashCalculator.result')}
              {result && (
                <span className="ml-2 text-xs nb-text-secondary font-normal">
                  ({t('tools.hashCalculator.lengthLabel', { count: result.length })})
                </span>
              )}
            </label>
            <div className="flex-1 px-3 py-2 nb-bg nb-border rounded-lg font-mono text-sm overflow-auto break-all nb-text">
              {result || (
                <span className="nb-text-secondary">
                  {t('tools.hashCalculator.emptyInput')}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </ToolCard>
  );
};
