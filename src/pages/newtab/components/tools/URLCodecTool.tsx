import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ToolCard } from '../../../../components/ToolCard';
import { TOOL_METADATA } from '../../../../types/tools';
import { ToolId, ToolComponentProps } from '../../../../types/tools';
import { useCopyToClipboard } from '../../../../hooks/useCopyToClipboard';
import { useRealTimeConvert } from '../../../../hooks/useRealTimeConvert';
import { useInputHistory } from '../../../../hooks/useInputHistory';
import { useBatchMode } from '../../../../hooks/useBatchMode';
import { useToolInvocation } from '../../../../hooks/useToolInvocation';
import { InputHistoryDropdown } from '../../../../components/InputHistoryDropdown';
import { SwapButton } from '../../../../components/SwapButton';
import { BatchModeToggle } from '../../../../components/BatchModeToggle';
import { loadToolDraft, useToolDraft } from '../../../../hooks/useToolDraft';

export interface UrlQueryParam {
  key: string;
  value: string;
  index: number;
}

export type UrlDetailsResult =
  | {
      success: true;
      protocol: string;
      host: string;
      pathname: string;
      hash: string;
      queryParams: UrlQueryParam[];
      normalizedUrl: string;
    }
  | { success: false; error: 'invalidUrl' };

export const parseUrlDetails = (value: string): UrlDetailsResult => {
  try {
    const url = new URL(value.trim());
    const queryParams = Array.from(url.searchParams.entries()).map(([key, paramValue], index) => ({
      key,
      value: paramValue,
      index,
    }));
    const search = url.searchParams.toString();
    const normalizedUrl = `${url.origin}${url.pathname}${search ? `?${search}` : ''}${url.hash}`;

    return {
      success: true,
      protocol: url.protocol,
      host: url.host,
      pathname: url.pathname,
      hash: url.hash,
      queryParams,
      normalizedUrl,
    };
  } catch {
    return { success: false, error: 'invalidUrl' };
  }
};

export const buildUrlWithQueryParams = (value: string, queryParams: UrlQueryParam[]): string => {
  const url = new URL(value.trim());
  url.search = '';
  queryParams
    .filter(param => param.key.trim())
    .sort((a, b) => a.index - b.index)
    .forEach(param => {
      url.searchParams.append(param.key, param.value);
    });
  const search = url.searchParams.toString();
  return `${url.origin}${url.pathname}${search ? `?${search}` : ''}${url.hash}`;
};

/**
 * URL 编解码工具组件
 */
export const URLCodecTool: React.FC<ToolComponentProps> = ({
  isExpanded,
  onToggleExpand,
  invocation,
  onInvocationHandled,
}) => {
  const { t } = useTranslation();
  const { copy } = useCopyToClipboard();
  const initialDraft = useMemo(() => loadToolDraft('url-codec'), []);
  const [mode, setMode] = useState<'encode' | 'decode'>(
    initialDraft?.mode === 'decode' ? 'decode' : 'encode',
  );
  const [encodeMethod, setEncodeMethod] = useState<'uri' | 'component'>('component');
  const [queryParams, setQueryParams] = useState<UrlQueryParam[]>([]);

  // 根据模式和方法选择转换函数
  const converter = useMemo(() => {
    if (mode === 'encode') {
      return encodeMethod === 'uri' 
        ? (text: string) => encodeURI(text)
        : (text: string) => encodeURIComponent(text);
    }
    return (text: string) => decodeURIComponent(text);
  }, [mode, encodeMethod]);

  const getConversionErrorMessage = useCallback(() => (
    mode === 'encode'
      ? t('tools.urlCodec.encodeError')
      : t('tools.urlCodec.decodeError')
  ), [mode, t]);

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
    getErrorMessage: getConversionErrorMessage,
    silentError: true,
    initialInput: initialDraft?.input ?? '',
  });

  useToolDraft('url-codec', { input, output, mode });

  useToolInvocation({
    invocation,
    targetToolId: ToolId.URL_CODEC,
    onInvocationHandled,
    onApply: useCallback((nextInvocation) => {
      if (nextInvocation.mode === 'decode' || nextInvocation.mode === 'encode') {
        setMode(nextInvocation.mode);
      }
      setInput(nextInvocation.input);
      setOutput('');
    }, [setInput, setOutput]),
  });

  const urlDetails = useMemo(() => parseUrlDetails(input), [input]);

  useEffect(() => {
    if (urlDetails.success) {
      setQueryParams(urlDetails.queryParams);
    } else {
      setQueryParams([]);
    }
  }, [urlDetails]);

  // 历史记录 Hook
  const { addToHistory } = useInputHistory({
    toolId: 'url-codec',
  });

  // 批量模式 Hook
  const batchMode = useBatchMode({
    converter,
    getErrorMessage: getConversionErrorMessage,
  });

  // 处理历史记录选择
  const handleHistorySelect = useCallback((content: string) => {
    setInput(content);
  }, [setInput]);

  // 处理手动转换（显示错误并保存历史）
  const handleConvert = useCallback(() => {
    convert();
    if (input.trim()) {
      let nextOutput = output;
      try {
        nextOutput = converter(input);
      } catch {
        // The conversion hook surfaces the localized error.
      }
      addToHistory(input, { output: nextOutput, mode });
    }
  }, [addToHistory, convert, converter, input, mode, output]);

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

  const handleQueryParamChange = useCallback((
    index: number,
    field: 'key' | 'value',
    value: string
  ) => {
    setQueryParams(params => params.map(param => (
      param.index === index ? { ...param, [field]: value } : param
    )));
  }, []);

  const handleAddQueryParam = useCallback(() => {
    setQueryParams(params => [
      ...params,
      { key: '', value: '', index: params.length ? Math.max(...params.map(param => param.index)) + 1 : 0 },
    ]);
  }, []);

  const handleRemoveQueryParam = useCallback((index: number) => {
    setQueryParams(params => params.filter(param => param.index !== index));
  }, []);

  const handleApplyQueryParams = useCallback(() => {
    if (!urlDetails.success) return;
    setInput(buildUrlWithQueryParams(input, queryParams));
  }, [input, queryParams, setInput, urlDetails]);

  const isBatchModeEnabled = batchMode.enabled;
  const processBatchInput = batchMode.process;

  // 批量模式下处理输入变化
  useEffect(() => {
    if (isBatchModeEnabled && input) {
      processBatchInput(input);
    }
  }, [isBatchModeEnabled, input, processBatchInput]);

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
            onSelectOutput={handleHistorySelect}
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
            <p className="text-sm" style={{ color: 'var(--color-error-text)' }}>{error}</p>
          </div>
        )}

        {urlDetails.success && (
          <div className="p-3 nb-bg-card nb-border rounded-lg flex-shrink-0 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 flex-1 min-w-0">
                <div className="min-w-0">
                  <div className="text-xs nb-text-secondary">{t('tools.urlCodec.protocol')}</div>
                  <div className="font-mono text-sm nb-text truncate">{urlDetails.protocol}</div>
                </div>
                <div className="min-w-0">
                  <div className="text-xs nb-text-secondary">{t('tools.urlCodec.host')}</div>
                  <div className="font-mono text-sm nb-text truncate">{urlDetails.host}</div>
                </div>
                <div className="min-w-0">
                  <div className="text-xs nb-text-secondary">{t('tools.urlCodec.path')}</div>
                  <div className="font-mono text-sm nb-text truncate">{urlDetails.pathname || '/'}</div>
                </div>
                <div className="min-w-0">
                  <div className="text-xs nb-text-secondary">{t('tools.urlCodec.hash')}</div>
                  <div className="font-mono text-sm nb-text truncate">{urlDetails.hash || '-'}</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => copy(urlDetails.normalizedUrl)}
                className="nb-btn nb-btn-secondary text-xs"
              >
                {t('tools.urlCodec.copyUrl')}
              </button>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium nb-text">{t('tools.urlCodec.queryParams')}</span>
                <div className="flex gap-2">
                  <button type="button" onClick={handleAddQueryParam} className="nb-btn nb-btn-secondary text-xs">
                    {t('tools.urlCodec.addParam')}
                  </button>
                  <button
                    type="button"
                    onClick={handleApplyQueryParams}
                    className="nb-btn nb-btn-primary text-xs"
                  >
                    {t('tools.urlCodec.applyParams')}
                  </button>
                </div>
              </div>
              <div className="space-y-2 max-h-32 overflow-auto">
                {queryParams.length === 0 ? (
                  <div className="text-sm nb-text-secondary">{t('tools.urlCodec.noQueryParams')}</div>
                ) : queryParams.map(param => (
                  <div key={param.index} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] gap-2">
                    <input
                      type="text"
                      value={param.key}
                      onChange={e => handleQueryParamChange(param.index, 'key', e.target.value)}
                      placeholder={t('tools.urlCodec.paramKey')}
                      className="nb-input font-mono text-xs"
                    />
                    <input
                      type="text"
                      value={param.value}
                      onChange={e => handleQueryParamChange(param.index, 'value', e.target.value)}
                      placeholder={t('tools.urlCodec.paramValue')}
                      className="nb-input font-mono text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveQueryParam(param.index)}
                      className="nb-btn nb-btn-ghost text-xs"
                    >
                      {t('tools.urlCodec.removeParam')}
                    </button>
                  </div>
                ))}
              </div>
            </div>
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
