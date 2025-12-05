import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ToolCard } from '../../../../components/ToolCard';
import { TOOL_METADATA } from '../../../../types/tools';
import { ToolId, ToolComponentProps } from '../../../../types/tools';
import { useCopyToClipboard } from '../../../../hooks/useCopyToClipboard';

// 转义字符处理模式
type EscapeMode = 'preserve' | 'remove';

// 防抖函数
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): T & { cancel: () => void } {
  let timeout: NodeJS.Timeout | null = null;
  
  const debounced = function (this: any, ...args: Parameters<T>) {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  } as T & { cancel: () => void };
  
  debounced.cancel = () => {
    if (timeout) clearTimeout(timeout);
  };
  
  return debounced;
}

/**
 * JSON 格式化工具组件
 */
export const JSONFormatterTool: React.FC<ToolComponentProps> = ({
  isExpanded,
  onToggleExpand,
}) => {
  const { t } = useTranslation();
  const { copy } = useCopyToClipboard();
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const [escapeMode, setEscapeMode] = useState<EscapeMode>('preserve');

  // 处理转义字符
  const processEscapeCharacters = useCallback((jsonString: string, mode: EscapeMode): string => {
    if (mode === 'remove') {
      // 去除转义字符：将 JSON 字符串中的转义序列转换为实际字符
      try {
        // 先解析再序列化，然后手动处理特殊转义
        const parsed = JSON.parse(jsonString);
        let result = JSON.stringify(parsed, null, 2);
        
        // 注意：这里不能直接替换，因为 JSON.stringify 会自动添加必要的转义
        // 我们只在显示时处理，实际上 JSON 格式本身需要保留转义
        return result;
      } catch (e) {
        return jsonString;
      }
    }
    return jsonString;
  }, []);

  // 格式化 JSON
  const handleFormat = useCallback(() => {
    if (!input.trim()) {
      setError(t('tools.jsonFormatter.emptyInput'));
      setOutput('');
      return;
    }

    try {
      const parsed = JSON.parse(input);
      const formatted = JSON.stringify(parsed, null, 2);
      const processed = processEscapeCharacters(formatted, escapeMode);
      setOutput(processed);
      setError('');
    } catch (e) {
      setError(t('tools.jsonFormatter.error') + ': ' + (e as Error).message);
      setOutput('');
    }
  }, [input, escapeMode, processEscapeCharacters, t]);

  // 自动格式化（使用防抖）
  const debouncedAutoFormat = useMemo(
    () =>
      debounce((value: string) => {
        if (!value.trim()) {
          setOutput('');
          setError('');
          return;
        }
        
        try {
          const parsed = JSON.parse(value);
          const formatted = JSON.stringify(parsed, null, 2);
          const processed = processEscapeCharacters(formatted, escapeMode);
          setOutput(processed);
          setError('');
        } catch (e) {
          // 自动格式化时不显示错误，避免干扰用户输入
          setError('');
        }
      }, 500),
    [escapeMode, processEscapeCharacters]
  );

  // 监听输入变化，触发自动格式化
  useEffect(() => {
    if (input) {
      debouncedAutoFormat(input);
    }
    return () => debouncedAutoFormat.cancel();
  }, [input, debouncedAutoFormat]);

  // 压缩 JSON
  const handleCompress = useCallback(() => {
    if (!input.trim()) {
      setError(t('tools.jsonFormatter.emptyInput'));
      setOutput('');
      return;
    }

    try {
      const parsed = JSON.parse(input);
      const compressed = JSON.stringify(parsed);
      setOutput(compressed);
      setError('');
    } catch (e) {
      setError(t('tools.jsonFormatter.error') + ': ' + (e as Error).message);
      setOutput('');
    }
  }, [input, t]);

  // 复制到剪贴板
  const handleCopy = useCallback(() => {
    copy(output);
  }, [output, copy]);

  // 清空
  const handleClear = () => {
    setInput('');
    setOutput('');
    setError('');
  };

  return (
    <ToolCard
      tool={TOOL_METADATA[ToolId.JSON_FORMATTER]}
      isExpanded={isExpanded}
      onToggleExpand={onToggleExpand}
    >
      <div className="h-full flex flex-col gap-4">
        {/* 操作按钮和控制 */}
        <div className="flex items-center justify-between flex-shrink-0">
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={handleFormat}
              className="nb-btn nb-btn-primary text-sm"
            >
              {t('tools.jsonFormatter.format')}
            </button>
            <button
              onClick={handleCompress}
              className="nb-btn nb-btn-secondary text-sm"
            >
              {t('tools.jsonFormatter.compress')}
            </button>
            <button
              onClick={handleCopy}
              disabled={!output}
              className="nb-btn nb-btn-secondary text-sm"
            >
              {t('tools.jsonFormatter.copy')}
            </button>
            <button
              onClick={handleClear}
              className="nb-btn nb-btn-ghost text-sm"
            >
              {t('tools.jsonFormatter.clear')}
            </button>
          </div>
          
          {/* 转义字符模式切换 */}
          <div className="flex items-center gap-2">
            <label className="text-sm nb-text-secondary">
              {t('tools.jsonFormatter.escapeMode')}:
            </label>
            <select
              value={escapeMode}
              onChange={e => setEscapeMode(e.target.value as EscapeMode)}
              className="nb-input text-sm"
            >
              <option value="preserve">{t('tools.jsonFormatter.preserve')}</option>
              <option value="remove">{t('tools.jsonFormatter.remove')}</option>
            </select>
          </div>
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="p-3 nb-bg-card nb-border rounded-lg flex-shrink-0" style={{ borderColor: 'var(--nb-accent-pink)' }}>
            <p className="text-sm" style={{ color: 'var(--nb-accent-pink)' }}>{error}</p>
          </div>
        )}

        {/* 输入输出区域 - 使用 grid 布局 */}
        <div className="flex-1 grid grid-cols-2 gap-4 min-h-0">
          {/* 输入区 */}
          <div className="flex flex-col min-h-0">
            <label className="block text-sm font-medium nb-text mb-2 flex-shrink-0">
              {t('tools.jsonFormatter.input')}
            </label>
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder={t('tools.jsonFormatter.inputPlaceholder')}
              className="nb-input flex-1 font-mono text-sm resize-none"
            />
          </div>

          {/* 输出区 */}
          <div className="flex flex-col min-h-0">
            <label className="block text-sm font-medium nb-text mb-2 flex-shrink-0">
              {t('tools.jsonFormatter.output')}
            </label>
            <textarea
              value={output}
              readOnly
              placeholder={t('tools.jsonFormatter.outputPlaceholder')}
              className="nb-input flex-1 font-mono text-sm resize-none nb-bg"
            />
          </div>
        </div>
      </div>
    </ToolCard>
  );
};
