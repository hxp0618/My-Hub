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

/**
 * URL 编解码工具组件
 */
export const URLCodecTool: React.FC<ToolComponentProps> = ({
  isExpanded,
  onToggleExpand,
}) => {
  const { t } = useTranslation();
  const { copy } = useCopyToClipboard();
  const [mode, setMode] = useState<'encode' | 'decode'>('encode');
  const [encodeMethod, setEncodeMethod] = useState<'uri' | 'component'>('component');

  // 根据模式和方法选择转换函数
  const converter = useMemo(() => {
    if (mode === 'encode') {
      return encodeMethod === 'uri' 
        ? (text: string) => encodeURI(text)
        : (text: string) => encodeURIComponent(text);
    }
    return (text: string) => decodeURIComponent(text);
  }, [mode, encodeMethod]);

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
    toolId: 'url-codec',
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
    swap();
    setMode(prev => prev === 'encode' ? 'decode' : 'encode');
  }, [swap]);

  // 处理模式切换
  const handleModeChange = useCallback((newMode: 'encode' | 'decode') => {
    if (newMode !== mode) {
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
      tool={TOOL_METADATA[ToolId.URL_CODEC]}
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
            {t('tools.urlCodec.encode')}
          </button>
          <button
            onClick={() => handleModeChange('decode')}
            className={`nb-btn text-sm ${
              mode === 'decode'
                ? 'nb-btn-primary'
                : 'nb-btn-secondary'
            }`}
          >
            {t('tools.urlCodec.decode')}
          </button>

          {/* 编码方式选择（仅在编码模式下显示） */}
          {mode === 'encode' && (
            <>
              <div className="w-px h-6 nb-border-r mx-1"></div>
              <button
                onClick={() => setEncodeMethod('component')}
                className={`nb-btn text-xs ${
                  encodeMethod === 'component'
                    ? 'nb-btn-primary'
                    : 'nb-btn-secondary'
                }`}
              >
                {t('tools.urlCodec.encodeComponent')}
              </button>
              <button
                onClick={() => setEncodeMethod('uri')}
                className={`nb-btn text-xs ${
                  encodeMethod === 'uri'
                    ? 'nb-btn-primary'
                    : 'nb-btn-secondary'
                }`}
              >
                {t('tools.urlCodec.encodeUri')}
              </button>
            </>
          )}

          <div className="w-px h-6 nb-border-r mx-1"></div>
          
          {/* 批量模式切换 */}
          <BatchModeToggle
            enabled={batchMode.enabled}
            onChange={batchMode.setEnabled}
          />

          <div className="flex-1"></div>
          
          {/* 历史记录 */}
          <InputHistoryDropdown
            toolId="url-codec"
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
              ? t('tools.urlCodec.encode')
              : t('tools.urlCodec.decode')}
          </button>
          <button
            onClick={handleCopy}
            disabled={!currentOutput}
            className="nb-btn nb-btn-secondary text-sm"
          >
            {t('tools.urlCodec.copy')}
          </button>
          <button
            onClick={handleClear}
            className="nb-btn nb-btn-ghost text-sm"
          >
            {t('tools.urlCodec.clear')}
          </button>
        </div>

        {/* 编码方式提示 */}
        {mode === 'encode' && !batchMode.enabled && (
          <div className="p-2 nb-bg-card nb-border rounded-lg flex-shrink-0" style={{ borderColor: 'var(--nb-accent-blue)' }}>
            <p className="text-xs" style={{ color: 'var(--nb-accent-blue)' }}>
              {encodeMethod === 'component'
                ? t('tools.urlCodec.componentHint')
                : t('tools.urlCodec.uriHint')}
            </p>
          </div>
        )}

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
                ? t('tools.urlCodec.inputText')
                : t('tools.urlCodec.inputEncoded')}
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
                    ? t('tools.urlCodec.textPlaceholder')
                    : t('tools.urlCodec.encodedPlaceholder')
              }
              className="nb-input flex-1 font-mono text-sm resize-none"
            />
          </div>

          <div className="flex flex-col min-h-0">
            <label className="block text-sm font-medium nb-text mb-2 flex-shrink-0">
              {mode === 'encode'
                ? t('tools.urlCodec.outputEncoded')
                : t('tools.urlCodec.outputText')}
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
