import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ToolCard } from '../../../../components/ToolCard';
import { TOOL_METADATA } from '../../../../types/tools';
import { ToolId, ToolComponentProps } from '../../../../types/tools';
import { useCopyToClipboard } from '../../../../hooks/useCopyToClipboard';
import { jsonrepair } from 'jsonrepair';

// 转义字符处理模式
type EscapeMode = 'preserve' | 'remove';

type DebouncedFunction<TArgs extends unknown[]> = ((...args: TArgs) => void) & {
  cancel: () => void;
};

type JsonPathToken = string | number;

export type JsonQueryResult =
  | { success: true; output: string }
  | { success: false; error: 'invalidJson' | 'invalidPath' | 'notFound' };

// 防抖函数：使用浏览器/测试环境通用的 timeout 类型，避免依赖 NodeJS 命名空间。
function debounce<TArgs extends unknown[]>(
  func: (...args: TArgs) => void,
  wait: number
): DebouncedFunction<TArgs> {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  
  const debounced = ((...args: TArgs) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  }) as DebouncedFunction<TArgs>;
  
  debounced.cancel = () => {
    if (timeout) {
      clearTimeout(timeout);
      timeout = null;
    }
  };
  
  return debounced;
}

const stringifyJsonValue = (value: unknown): string => {
  const serialized = JSON.stringify(value, null, 2);
  return serialized ?? String(value);
};

/**
 * 将宽松 JSON 修复成严格、格式化后的 JSON。
 */
export const repairJsonInput = (value: string, indent = 2): string => {
  const repaired = jsonrepair(value);
  return JSON.stringify(JSON.parse(repaired), null, indent);
};

const parseJsonPath = (path: string): JsonPathToken[] | null => {
  const normalizedPath = path.trim();
  if (!normalizedPath || normalizedPath[0] !== '$') return null;
  if (normalizedPath === '$') return [];

  const tokens: JsonPathToken[] = [];
  let index = 1;

  while (index < normalizedPath.length) {
    const char = normalizedPath[index];

    if (char === '.') {
      index += 1;
      const match = /^[A-Za-z_$][\w$-]*/.exec(normalizedPath.slice(index));
      if (!match) return null;
      tokens.push(match[0]);
      index += match[0].length;
      continue;
    }

    if (char === '[') {
      const rest = normalizedPath.slice(index);
      const indexMatch = /^\[(\d+)\]/.exec(rest);
      if (indexMatch) {
        tokens.push(Number(indexMatch[1]));
        index += indexMatch[0].length;
        continue;
      }

      const quotedMatch = /^\[['"]([^'"]+)['"]\]/.exec(rest);
      if (quotedMatch) {
        tokens.push(quotedMatch[1]);
        index += quotedMatch[0].length;
        continue;
      }
    }

    return null;
  }

  return tokens;
};

/**
 * 查询 JSON 中的简单路径，支持 $.name、$.items[0]、$["key"]。
 */
export const queryJsonPath = (jsonText: string, path: string): JsonQueryResult => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    return { success: false, error: 'invalidJson' };
  }

  const tokens = parseJsonPath(path);
  if (!tokens) return { success: false, error: 'invalidPath' };

  let current = parsed;
  for (const token of tokens) {
    if (typeof token === 'number') {
      if (!Array.isArray(current) || token < 0 || token >= current.length) {
        return { success: false, error: 'notFound' };
      }
      current = current[token];
      continue;
    }

    if (
      typeof current !== 'object' ||
      current === null ||
      !Object.prototype.hasOwnProperty.call(current, token)
    ) {
      return { success: false, error: 'notFound' };
    }
    current = (current as Record<string, unknown>)[token];
  }

  return { success: true, output: stringifyJsonValue(current) };
};

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
  const [queryPath, setQueryPath] = useState('');
  const [queryOutput, setQueryOutput] = useState('');
  const [queryError, setQueryError] = useState('');

  // 处理转义字符
  const processEscapeCharacters = useCallback((jsonString: string, mode: EscapeMode): string => {
    if (mode === 'remove') {
      // 去除转义字符：将 JSON 字符串中的转义序列转换为实际字符
      try {
        // 先解析再序列化，然后手动处理特殊转义
        const parsed = JSON.parse(jsonString);
        const result = JSON.stringify(parsed, null, 2);
        
        // 注意：这里不能直接替换，因为 JSON.stringify 会自动添加必要的转义
        // 我们只在显示时处理，实际上 JSON 格式本身需要保留转义
        return result;
      } catch {
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
    } catch {
      setError(t('tools.jsonFormatter.error'));
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
        } catch {
          // 自动格式化时不显示错误，避免干扰用户输入
          setOutput('');
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
    } catch {
      setError(t('tools.jsonFormatter.error'));
      setOutput('');
    }
  }, [input, t]);

  // 修复宽松 JSON
  const handleRepair = useCallback(() => {
    if (!input.trim()) {
      setError(t('tools.jsonFormatter.emptyInput'));
      setOutput('');
      return;
    }

    try {
      const repaired = repairJsonInput(input);
      setOutput(repaired);
      setError('');
    } catch {
      setError(t('tools.jsonFormatter.error'));
      setOutput('');
    }
  }, [input, t]);

  const handleQuery = useCallback(() => {
    const path = queryPath.trim();
    if (!path) {
      setQueryError(t('tools.jsonFormatter.queryEmpty'));
      setQueryOutput('');
      return;
    }

    const source = output.trim() ? output : input;
    const result = queryJsonPath(source, path);
    if (result.success) {
      setQueryOutput(result.output);
      setQueryError('');
      return;
    }

    const messageKey = {
      invalidJson: 'tools.jsonFormatter.error',
      invalidPath: 'tools.jsonFormatter.queryInvalidPath',
      notFound: 'tools.jsonFormatter.queryNotFound',
    }[result.error];
    setQueryError(t(messageKey));
    setQueryOutput('');
  }, [input, output, queryPath, t]);

  // 复制到剪贴板
  const handleCopy = useCallback(() => {
    copy(output);
  }, [output, copy]);

  // 清空
  const handleClear = () => {
    setInput('');
    setOutput('');
    setError('');
    setQueryPath('');
    setQueryOutput('');
    setQueryError('');
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
              onClick={handleRepair}
              className="nb-btn nb-btn-secondary text-sm"
            >
              {t('tools.jsonFormatter.repair')}
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
            <p className="text-sm" style={{ color: 'var(--color-error-text)' }}>{error}</p>
          </div>
        )}

        {/* JSON 路径查询 */}
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] gap-3 items-end flex-shrink-0">
          <div>
            <label className="block text-sm font-medium nb-text mb-2">
              {t('tools.jsonFormatter.queryLabel')}
            </label>
            <input
              type="text"
              value={queryPath}
              onChange={e => setQueryPath(e.target.value)}
              placeholder={t('tools.jsonFormatter.queryPlaceholder')}
              className="nb-input w-full font-mono text-sm"
            />
          </div>
          <button
            onClick={handleQuery}
            className="nb-btn nb-btn-secondary text-sm"
          >
            {t('tools.jsonFormatter.query')}
          </button>
          <div>
            <label className="block text-sm font-medium nb-text mb-2">
              {t('tools.jsonFormatter.queryResult')}
            </label>
            <div className="min-h-10 px-3 py-2 nb-bg nb-border rounded-lg font-mono text-sm overflow-auto break-all nb-text">
              {queryOutput || (
                <span style={{ color: queryError ? 'var(--color-error-text)' : undefined }} className={!queryError ? 'nb-text-secondary' : undefined}>
                  {queryError || t('tools.jsonFormatter.queryResult')}
                </span>
              )}
            </div>
          </div>
        </div>

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
