import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ToolCard } from '../../../../components/ToolCard';
import { TOOL_METADATA } from '../../../../types/tools';
import { ToolId, ToolComponentProps } from '../../../../types/tools';
import { useCopyToClipboard } from '../../../../hooks/useCopyToClipboard';
import { useRealTimeConvert } from '../../../../hooks/useRealTimeConvert';
import { useInputHistory } from '../../../../hooks/useInputHistory';
import { useBatchMode } from '../../../../hooks/useBatchMode';
import { InputHistoryDropdown } from '../../../../components/InputHistoryDropdown';
import { SwapButton } from '../../../../components/SwapButton';
import { BatchModeToggle } from '../../../../components/BatchModeToggle';

// Base64 编码（支持 UTF-8）
const encodeBase64 = (text: string): string => {
  return btoa(unescape(encodeURIComponent(text)));
};

// Base64 解码（支持 UTF-8）
const decodeBase64 = (base64: string): string => {
  return decodeURIComponent(escape(atob(base64)));
};

/**
 * Base64 编解码工具组件
 */
export const Base64ConverterTool: React.FC<ToolComponentProps> = ({
  isExpanded,
  onToggleExpand,
}) => {
  const { t } = useTranslation();
  const { copy } = useCopyToClipboard();
  const [mode, setMode] = useState<'encode' | 'decode'>('encode');

  // 根据模式选择转换函数
  const converter = useMemo(() => {
    return mode === 'encode' ? encodeBase64 : decodeBase64;
  }, [mode]);

  // 实时转换 Hook
  const {
    input,
    output,
    error,
    setInput,
    convert,
    swap,
    clear,
    setOutput,
  } = useRealTimeConvert(converter, {
    debounceMs: 300,
    silentError: true,
  });

  // 历史记录 Hook
  const { addToHistory } = useInputHistory({
    toolId: 'base64-converter',
  });

  // 批量模式 Hook
  const batchMode = useBatchMode({
    converter,
  });

  // 处理历史记录选择
  const handleHistorySelect = useCallback((content: string) => {
    setInput(content);
  }, [setInput]);

  // 处理手动转换（显示错误并保存历史）
  const handleConvert = useCallback(() => {
    convert();
    if (input.trim()) {
      addToHistory(input);
    }
  }, [convert, input, addToHistory]);

  // 处理复制
  const handleCopy = useCallback(() => {
    if (batchMode.enabled) {
      copy(batchMode.getSuccessfulResults());
    } else {
      copy(output);
    }
  }, [copy, output, batchMode]);

  // 处理交换（同时切换模式）
  const handleSwap = useCallback(() => {
    const currentOutput = output;
    swap();
    // 切换模式
    setMode(prev => prev === 'encode' ? 'decode' : 'encode');
  }, [swap, output]);

  // 处理模式切换
  const handleModeChange = useCallback((newMode: 'encode' | 'decode') => {
    if (newMode !== mode) {
      // 如果有输出，将输出移到输入并切换模式
      if (output) {
        setInput(output);
        setOutput('');
      }
      setMode(newMode);
    }
  }, [mode, output, setInput, setOutput]);

  // 处理清空
  const handleClear = useCallback(() => {
    clear();
    batchMode.clearResults();
  }, [clear, batchMode]);

  // 批量模式下处理输入变化
  useEffect(() => {
    if (batchMode.enabled && input) {
      batchMode.process(input);
    }
  }, [batchMode.enabled, input, batchMode.process]);

  // 获取当前输出内容
  const currentOutput = batchMode.enabled 
    ? batchMode.results.map(r => r.success ? r.output : `[${t('tools.common.error')}]`).join('\n')
    : output;

  return (
    <ToolCard
      tool={TOOL_METADATA[ToolId.BASE64_CONVERTER]}
      isExpanded={isExpanded}
      onToggleExpand={onToggleExpand}
    >
      <div className="h-full flex flex-col gap-4">
        {/* 模式切换和操作按钮 */}
        <div className="flex gap-2 flex-wrap flex-shrink-0 items-center">
          <button
            onClick={() => handleModeChange('encode')}
            className={`nb-btn text-sm ${
              mode === 'encode'
                ? 'nb-btn-primary'
                : 'nb-btn-secondary'
            }`}
          >
            {t('tools.base64Converter.encode')}
          </button>
          <button
            onClick={() => handleModeChange('decode')}
            className={`nb-btn text-sm ${
              mode === 'decode'
                ? 'nb-btn-primary'
                : 'nb-btn-secondary'
            }`}
          >
            {t('tools.base64Converter.decode')}
          </button>
          
          <div className="w-px h-6 nb-border-r mx-1"></div>
          
          {/* 批量模式切换 */}
          <BatchModeToggle
            enabled={batchMode.enabled}
            onChange={batchMode.setEnabled}
          />
          
          <div className="flex-1"></div>
          
          {/* 历史记录 */}
          <InputHistoryDropdown
            toolId="base64-converter"
            onSelect={handleHistorySelect}
          />
          
          {/* 交换按钮 */}
          <SwapButton
            onClick={handleSwap}
            disabled={!output && !batchMode.results.length}
          />
          
          <button
            onClick={handleConvert}
            className="nb-btn nb-btn-primary text-sm"
          >
            {mode === 'encode'
              ? t('tools.base64Converter.encode')
              : t('tools.base64Converter.decode')}
          </button>
          <button
            onClick={handleCopy}
            disabled={!currentOutput}
            className="nb-btn nb-btn-secondary text-sm"
          >
            {t('tools.base64Converter.copy')}
          </button>
          <button
            onClick={handleClear}
            className="nb-btn nb-btn-ghost text-sm"
          >
            {t('tools.base64Converter.clear')}
          </button>
        </div>

        {/* 批量模式统计 */}
        {batchMode.enabled && batchMode.results.length > 0 && (
          <div className="p-2 nb-bg-card nb-border rounded-lg flex-shrink-0" style={{ borderColor: 'var(--nb-accent-blue)' }}>
            <p className="text-xs" style={{ color: 'var(--nb-accent-blue)' }}>
              {t('tools.common.batchStats', {
                total: batchMode.results.length,
                success: batchMode.successCount,
                failure: batchMode.failureCount,
              })}
            </p>
          </div>
        )}

        {/* 错误提示（仅非批量模式） */}
        {!batchMode.enabled && error && (
          <div className="p-3 nb-bg-card nb-border rounded-lg flex-shrink-0" style={{ borderColor: 'var(--nb-accent-pink)' }}>
            <p className="text-sm" style={{ color: 'var(--nb-accent-pink)' }}>{error}</p>
          </div>
        )}

        {/* 输入输出区域 */}
        <div className="flex-1 grid grid-cols-2 gap-4 min-h-0">
          <div className="flex flex-col min-h-0">
            <label className="block text-sm font-medium nb-text mb-2 flex-shrink-0">
              {mode === 'encode'
                ? t('tools.base64Converter.inputText')
                : t('tools.base64Converter.inputBase64')}
              {batchMode.enabled && (
                <span className="text-xs nb-text-secondary ml-2">
                  ({t('tools.common.onePerLine')})
                </span>
              )}
            </label>
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder={
                batchMode.enabled
                  ? t('tools.common.batchPlaceholder')
                  : mode === 'encode'
                    ? t('tools.base64Converter.textPlaceholder')
                    : t('tools.base64Converter.base64Placeholder')
              }
              className="nb-input flex-1 font-mono text-sm resize-none"
            />
          </div>

          <div className="flex flex-col min-h-0">
            <label className="block text-sm font-medium nb-text mb-2 flex-shrink-0">
              {mode === 'encode'
                ? t('tools.base64Converter.outputBase64')
                : t('tools.base64Converter.outputText')}
            </label>
            <textarea
              value={currentOutput}
              readOnly
              className="nb-input flex-1 font-mono text-sm resize-none nb-bg"
            />
          </div>
        </div>
      </div>
    </ToolCard>
  );
};
