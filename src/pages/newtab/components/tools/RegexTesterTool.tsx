import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ToolCard } from '../../../../components/ToolCard';
import { TOOL_METADATA, ToolId, ToolComponentProps } from '../../../../types/tools';

interface MatchResult {
  match: string;
  index: number;
  groups: string[];
  namedGroups?: Record<string, string>;
}

export type RegexErrorCode = 'invalidExpression';

export interface RegexTestResult {
  matches: MatchResult[];
  error: RegexErrorCode | null;
}

export interface RegexReplaceResult {
  output: string;
  error: RegexErrorCode | null;
}

const getNamedGroups = (match: RegExpExecArray): Record<string, string> | undefined => {
  if (!match.groups) return undefined;
  return Object.fromEntries(
    Object.entries(match.groups).map(([key, value]) => [key, value ?? ''])
  );
};

/**
 * 执行正则匹配
 */
export const executeRegex = (
  pattern: string,
  flags: string,
  testText: string
): RegexTestResult => {
  if (!pattern) {
    return { matches: [], error: null };
  }

  try {
    const regex = new RegExp(pattern, flags);
    const matches: MatchResult[] = [];

    if (flags.includes('g')) {
      let match;
      while ((match = regex.exec(testText)) !== null) {
        matches.push({
          match: match[0],
          index: match.index,
          groups: match.slice(1),
          namedGroups: getNamedGroups(match),
        });
        // 防止无限循环
        if (match[0].length === 0) {
          regex.lastIndex++;
        }
      }
    } else {
      const match = regex.exec(testText);
      if (match) {
        matches.push({
          match: match[0],
          index: match.index,
          groups: match.slice(1),
          namedGroups: getNamedGroups(match),
        });
      }
    }

    return { matches, error: null };
  } catch {
    return { matches: [], error: 'invalidExpression' };
  }
};

export const replaceRegex = (
  pattern: string,
  flags: string,
  testText: string,
  replacement: string
): RegexReplaceResult => {
  if (!pattern) {
    return { output: testText, error: null };
  }

  try {
    const regex = new RegExp(pattern, flags);
    return { output: testText.replace(regex, replacement), error: null };
  } catch {
    return { output: '', error: 'invalidExpression' };
  }
};

/**
 * 正则表达式测试器工具组件
 */
export const RegexTesterTool: React.FC<ToolComponentProps> = ({
  isExpanded,
  onToggleExpand,
}) => {
  const { t } = useTranslation();
  const [operationMode, setOperationMode] = useState<'match' | 'replace'>('match');
  const [pattern, setPattern] = useState('');
  const [flags, setFlags] = useState('g');
  const [testText, setTestText] = useState('');
  const [replacement, setReplacement] = useState('');
  const [result, setResult] = useState<RegexTestResult>({ matches: [], error: null });

  // 标志选项
  const flagOptions = [
    { value: 'g', label: 'g (global)' },
    { value: 'i', label: 'i (ignore case)' },
    { value: 'm', label: 'm (multiline)' },
    { value: 's', label: 's (dotAll)' },
    { value: 'u', label: 'u (unicode)' },
    { value: 'y', label: 'y (sticky)' },
    { value: 'd', label: 'd (indices)' },
  ];

  // 切换标志
  const toggleFlag = (flag: string) => {
    if (flags.includes(flag)) {
      setFlags(flags.replace(flag, ''));
    } else {
      setFlags(flags + flag);
    }
  };

  // 实时执行匹配
  useEffect(() => {
    const newResult = executeRegex(pattern, flags, testText);
    setResult(newResult);
  }, [pattern, flags, testText]);

  const replacementResult = useMemo(
    () => replaceRegex(pattern, flags, testText, replacement),
    [flags, pattern, replacement, testText]
  );

  // 高亮显示匹配结果
  const highlightedText = useMemo(() => {
    if (!testText || result.matches.length === 0 || result.error) {
      return testText;
    }

    const parts: React.ReactNode[] = [];
    let lastIndex = 0;

    result.matches.forEach((match, i) => {
      // 添加匹配前的文本
      if (match.index > lastIndex) {
        parts.push(testText.slice(lastIndex, match.index));
      }
      // 添加高亮的匹配文本
      parts.push(
        <mark key={i} className="bg-yellow-300 dark:bg-yellow-600 px-0.5 rounded">
          {match.match}
        </mark>
      );
      lastIndex = match.index + match.match.length;
    });

    // 添加剩余文本
    if (lastIndex < testText.length) {
      parts.push(testText.slice(lastIndex));
    }

    return parts;
  }, [testText, result.matches, result.error]);

  const handleClear = () => {
    setPattern('');
    setTestText('');
    setReplacement('');
    setResult({ matches: [], error: null });
  };

  return (
    <ToolCard
      tool={TOOL_METADATA[ToolId.REGEX_TESTER]}
      isExpanded={isExpanded}
      onToggleExpand={onToggleExpand}
    >
      <div className="h-full flex flex-col gap-4">
        {/* 正则输入区 */}
        <div className="flex-shrink-0 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-sm nb-text-secondary">{t('tools.regexTester.mode')}:</span>
            <button
              type="button"
              onClick={() => setOperationMode('match')}
              className={`nb-btn text-sm ${operationMode === 'match' ? 'nb-btn-primary' : 'nb-btn-secondary'}`}
            >
              {t('tools.regexTester.matchMode')}
            </button>
            <button
              type="button"
              onClick={() => setOperationMode('replace')}
              className={`nb-btn text-sm ${operationMode === 'replace' ? 'nb-btn-primary' : 'nb-btn-secondary'}`}
            >
              {t('tools.regexTester.replaceMode')}
            </button>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium nb-text mb-1">
                {t('tools.regexTester.pattern')}
              </label>
              <div className="flex items-center gap-2">
                <span className="nb-text-secondary">/</span>
                <input
                  type="text"
                  value={pattern}
                  onChange={e => setPattern(e.target.value)}
                  placeholder={t('tools.regexTester.patternPlaceholder')}
                  className="nb-input flex-1 font-mono text-sm"
                />
                <span className="nb-text-secondary">/{flags}</span>
              </div>
            </div>
            <button
              onClick={handleClear}
              className="nb-btn nb-btn-ghost text-sm self-end"
            >
              {t('tools.regexTester.clear')}
            </button>
          </div>

          {/* 标志选择 */}
          <div className="flex items-center gap-4">
            <span className="text-sm nb-text-secondary">{t('tools.regexTester.flags')}:</span>
            {flagOptions.map(opt => (
              <label key={opt.value} className="flex items-center gap-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={flags.includes(opt.value)}
                  onChange={() => toggleFlag(opt.value)}
                  className="w-4 h-4 rounded nb-border accent-[var(--nb-accent-yellow)]"
                />
                <span className="text-sm nb-text">{opt.label}</span>
              </label>
            ))}
          </div>

          {/* 错误提示 */}
          {result.error && (
            <div className="p-3 nb-bg-card nb-border rounded-lg" style={{ borderColor: 'var(--nb-accent-pink)' }}>
              <p className="text-sm" style={{ color: 'var(--color-error-text)' }}>
                <span className="font-medium">{t('tools.regexTester.error')}:</span> {t(`tools.regexTester.errors.${result.error}`)}
              </p>
            </div>
          )}

          {operationMode === 'replace' && (
            <div>
              <label className="block text-sm font-medium nb-text mb-1">
                {t('tools.regexTester.replacement')}
              </label>
              <input
                type="text"
                value={replacement}
                onChange={e => setReplacement(e.target.value)}
                placeholder={t('tools.regexTester.replacementPlaceholder')}
                className="nb-input w-full font-mono text-sm"
              />
            </div>
          )}
        </div>

        {/* 测试文本和结果区域 */}
        <div className="flex-1 grid grid-cols-2 gap-4 min-h-0">
          {/* 测试文本 */}
          <div className="flex flex-col min-h-0">
            <label className="block text-sm font-medium nb-text mb-2 flex-shrink-0">
              {t('tools.regexTester.testText')}
            </label>
            <textarea
              value={testText}
              onChange={e => setTestText(e.target.value)}
              placeholder={t('tools.regexTester.testTextPlaceholder')}
              className="nb-input flex-1 font-mono text-sm resize-none"
            />
          </div>

          {/* 匹配/替换结果 */}
          <div className="flex flex-col min-h-0">
            <label className="block text-sm font-medium nb-text mb-2 flex-shrink-0">
              {operationMode === 'match' ? t('tools.regexTester.matches') : t('tools.regexTester.replaceResult')}
              {operationMode === 'match' && result.matches.length > 0 && (
                <span className="ml-2 text-xs nb-text-secondary font-normal">
                  ({t('tools.regexTester.matchCount', { count: result.matches.length })})
                </span>
              )}
            </label>
            <div className="flex-1 nb-card-static overflow-auto">
              {operationMode === 'replace' ? (
                <div className="p-3 font-mono text-sm whitespace-pre-wrap break-all nb-text">
                  {replacementResult.error ? '' : replacementResult.output}
                </div>
              ) : result.matches.length === 0 ? (
                <div className="h-full flex items-center justify-center nb-text-secondary text-sm">
                  {result.error ? '' : t('tools.regexTester.noMatches')}
                </div>
              ) : (
                <div className="p-3 space-y-2">
                  {/* 高亮预览 */}
                  <div className="p-2 nb-bg rounded-lg font-mono text-sm whitespace-pre-wrap break-all nb-text">
                    {highlightedText}
                  </div>
                  
                  {/* 捕获组 */}
                  {result.matches.some(m => m.groups.length > 0) && (
                    <div className="mt-3">
                      <p className="text-xs nb-text-secondary mb-2">{t('tools.regexTester.groups')}:</p>
                      {result.matches.map((match, i) => (
                        match.groups.length > 0 && (
                          <div key={i} className="p-2 nb-bg rounded-lg mb-1">
                            <p className="text-xs nb-text-secondary mb-1">Match {i + 1}:</p>
                            {match.groups.map((group, j) => (
                              <p key={j} className="font-mono text-sm nb-text">
                                <span className="nb-text-secondary">Group {j + 1}:</span> {group || '(empty)'}
                              </p>
                            ))}
                          </div>
                        )
                      ))}
                    </div>
                  )}
                  {result.matches.some(m => m.namedGroups && Object.keys(m.namedGroups).length > 0) && (
                    <div className="mt-3">
                      <p className="text-xs nb-text-secondary mb-2">{t('tools.regexTester.namedGroups')}:</p>
                      {result.matches.map((match, i) => (
                        match.namedGroups && Object.keys(match.namedGroups).length > 0 && (
                          <div key={i} className="p-2 nb-bg rounded-lg mb-1">
                            <p className="text-xs nb-text-secondary mb-1">Match {i + 1}:</p>
                            {Object.entries(match.namedGroups).map(([name, value]) => (
                              <p key={name} className="font-mono text-sm nb-text">
                                <span className="nb-text-secondary">{name}:</span> {value || '(empty)'}
                              </p>
                            ))}
                          </div>
                        )
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </ToolCard>
  );
};
