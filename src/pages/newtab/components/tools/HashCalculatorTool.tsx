import React, { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ToolCard } from '../../../../components/ToolCard';
import { TOOL_METADATA, ToolId, ToolComponentProps } from '../../../../types/tools';
import { useCopyToClipboard } from '../../../../hooks/useCopyToClipboard';
import CryptoJS from 'crypto-js';

export type HashAlgorithm = 'MD5' | 'SHA1' | 'SHA256' | 'SHA512';

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
export const calculateHash = (input: string, algorithm: HashAlgorithm): string => {
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

/**
 * 哈希计算器工具组件
 */
export const HashCalculatorTool: React.FC<ToolComponentProps> = ({
  isExpanded,
  onToggleExpand,
}) => {
  const { t } = useTranslation();
  const { copy } = useCopyToClipboard();
  const [input, setInput] = useState('');
  const [algorithm, setAlgorithm] = useState<HashAlgorithm>('SHA256');
  const [uppercase, setUppercase] = useState(false);
  const [result, setResult] = useState('');

  // 实时计算哈希
  useEffect(() => {
    if (input) {
      const hash = calculateHash(input, algorithm);
      setResult(uppercase ? hash.toUpperCase() : hash.toLowerCase());
    } else {
      setResult('');
    }
  }, [input, algorithm, uppercase]);

  const handleCopy = useCallback(() => {
    copy(result);
  }, [result, copy]);

  const handleClear = () => {
    setInput('');
    setResult('');
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
              {t('tools.hashCalculator.input')}
            </label>
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder={t('tools.hashCalculator.inputPlaceholder')}
              className="nb-input flex-1 font-mono text-sm resize-none"
            />
          </div>

          {/* 输出区 */}
          <div className="flex flex-col min-h-0">
            <label className="block text-sm font-medium nb-text mb-2 flex-shrink-0">
              {t('tools.hashCalculator.result')}
              {result && (
                <span className="ml-2 text-xs nb-text-secondary font-normal">
                  ({result.length} chars)
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
