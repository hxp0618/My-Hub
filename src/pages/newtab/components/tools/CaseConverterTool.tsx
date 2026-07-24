import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ToolCard } from '../../../../components/ToolCard';
import { TOOL_METADATA } from '../../../../types/tools';
import { ToolId, ToolComponentProps } from '../../../../types/tools';
import { useCopyToClipboard } from '../../../../hooks/useCopyToClipboard';
import { useInputHistory } from '../../../../hooks/useInputHistory';
import { InputHistoryDropdown } from '../../../../components/InputHistoryDropdown';
import { useToolInvocation } from '../../../../hooks/useToolInvocation';
import { loadToolDraft, useToolDraft } from '../../../../hooks/useToolDraft';

// 大小写转换类型
export type CaseType =
    | 'camelCase'      // camelCase
    | 'pascalCase'     // PascalCase
    | 'snakeCase'      // snake_case
    | 'kebabCase'      // kebab-case
    | 'constantCase'   // CONSTANT_CASE
    | 'dotCase'        // dot.case
    | 'pathCase'       // path/case
    | 'titleCase'      // Title Case
    | 'sentenceCase'   // Sentence case
    | 'uppercase'      // UPPERCASE
    | 'lowercase';     // lowercase

// 分词函数：将输入字符串拆分为单词数组
export const splitIntoWords = (text: string): string[] => {
    // 清理前后空白
    text = text.trim();
    if (!text) return [];

    // 首先处理常见分隔符
    // 处理下划线、连字符、点、斜杠、空格等分隔符
    const words = text
        // 先拆开连续缩写和普通 PascalCase 单词，例如 XMLHttp -> XML Http
        .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
        // 在大写字母前添加空格（处理 camelCase 和 PascalCase）
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        // 在数字和字母之间添加空格
        .replace(/([a-zA-Z])(\d)/g, '$1 $2')
        .replace(/(\d)([a-zA-Z])/g, '$1 $2')
        // 替换常见分隔符为空格
        .replace(/[_\-./\\]+/g, ' ')
        // 移除多余空格
        .replace(/\s+/g, ' ')
        .trim()
        .split(' ')
        .filter(word => word.length > 0);

    return words;
};

// 转换为 camelCase
const toCamelCase = (text: string): string => {
    const words = splitIntoWords(text);
    if (words.length === 0) return '';

    return words.map((word, index) => {
        const lower = word.toLowerCase();
        if (index === 0) return lower;
        return lower.charAt(0).toUpperCase() + lower.slice(1);
    }).join('');
};

// 转换为 PascalCase
const toPascalCase = (text: string): string => {
    const words = splitIntoWords(text);
    if (words.length === 0) return '';

    return words.map(word => {
        const lower = word.toLowerCase();
        return lower.charAt(0).toUpperCase() + lower.slice(1);
    }).join('');
};

// 转换为 snake_case
const toSnakeCase = (text: string): string => {
    const words = splitIntoWords(text);
    return words.map(word => word.toLowerCase()).join('_');
};

// 转换为 kebab-case
const toKebabCase = (text: string): string => {
    const words = splitIntoWords(text);
    return words.map(word => word.toLowerCase()).join('-');
};

// 转换为 CONSTANT_CASE
const toConstantCase = (text: string): string => {
    const words = splitIntoWords(text);
    return words.map(word => word.toUpperCase()).join('_');
};

// 转换为 dot.case
const toDotCase = (text: string): string => {
    const words = splitIntoWords(text);
    return words.map(word => word.toLowerCase()).join('.');
};

// 转换为 path/case
const toPathCase = (text: string): string => {
    const words = splitIntoWords(text);
    return words.map(word => word.toLowerCase()).join('/');
};

// 转换为 Title Case
const toTitleCase = (text: string): string => {
    const words = splitIntoWords(text);
    return words.map(word => {
        const lower = word.toLowerCase();
        return lower.charAt(0).toUpperCase() + lower.slice(1);
    }).join(' ');
};

// 转换为 Sentence case
const toSentenceCase = (text: string): string => {
    const words = splitIntoWords(text);
    if (words.length === 0) return '';

    return words.map((word, index) => {
        const lower = word.toLowerCase();
        if (index === 0) return lower.charAt(0).toUpperCase() + lower.slice(1);
        return lower;
    }).join(' ');
};

// 转换为 UPPERCASE
const toUpperCase = (text: string): string => {
    return text.toUpperCase();
};

// 转换为 lowercase
const toLowerCase = (text: string): string => {
    return text.toLowerCase();
};

// 转换函数映射
const converters: Record<CaseType, (text: string) => string> = {
    camelCase: toCamelCase,
    pascalCase: toPascalCase,
    snakeCase: toSnakeCase,
    kebabCase: toKebabCase,
    constantCase: toConstantCase,
    dotCase: toDotCase,
    pathCase: toPathCase,
    titleCase: toTitleCase,
    sentenceCase: toSentenceCase,
    uppercase: toUpperCase,
    lowercase: toLowerCase,
};

export const convertCase = (text: string, caseType: CaseType): string => converters[caseType](text);

// 所有大小写类型
const caseTypes: CaseType[] = [
    'camelCase',
    'pascalCase',
    'snakeCase',
    'kebabCase',
    'constantCase',
    'dotCase',
    'pathCase',
    'titleCase',
    'sentenceCase',
    'uppercase',
    'lowercase',
];

/**
 * 大小写转换工具组件
 */
export const CaseConverterTool: React.FC<ToolComponentProps> = ({
    isExpanded,
    onToggleExpand,
    invocation,
    onInvocationHandled,
}) => {
    const { t } = useTranslation();
    const { copy } = useCopyToClipboard();
    const initialDraft = useMemo(() => loadToolDraft('case-converter'), []);
    const [input, setInput] = useState(initialDraft?.input ?? '');
    const [batchMode, setBatchMode] = useState(initialDraft?.mode === 'batch');

    useToolDraft('case-converter', { input, mode: batchMode ? 'batch' : 'single' });

    const applyInvocation = useCallback((nextInvocation: NonNullable<ToolComponentProps['invocation']>) => {
        setInput(nextInvocation.input);
        setBatchMode(nextInvocation.input.includes('\n'));
    }, []);

    useToolInvocation({
        invocation,
        targetToolId: ToolId.CASE_CONVERTER,
        onInvocationHandled,
        onApply: applyInvocation,
    });

    // 历史记录 Hook
    const { addToHistory } = useInputHistory({
        toolId: 'case-converter',
    });

    // 处理历史记录选择
    const handleHistorySelect = useCallback((content: string) => {
        setInput(content);
    }, []);

    // 文本统计
    const textStats = useMemo(() => {
        const text = input.trim();
        if (!text) return null;

        const chars = text.length;
        const charsNoSpaces = text.replace(/\s/g, '').length;
        const words = splitIntoWords(text).length;
        const lines = text.split('\n').filter(line => line.trim()).length;

        return { chars, charsNoSpaces, words, lines };
    }, [input]);

    // 计算所有转换结果（支持批量模式）
    const results = useMemo(() => {
        if (!input.trim()) return null;

        if (batchMode) {
            // 批量模式：每行分别转换
            const lines = input.split('\n').filter(line => line.trim());
            return caseTypes.map(caseType => ({
                type: caseType,
                result: lines.map(line => convertCase(line, caseType)).join('\n'),
            }));
        } else {
            // 单行模式
            return caseTypes.map(caseType => ({
                type: caseType,
                result: convertCase(input, caseType),
            }));
        }
    }, [input, batchMode]);

    // 处理复制
    const handleCopy = useCallback((text: string) => {
        copy(text);
    }, [copy]);

    // 复制全部结果
    const handleCopyAll = useCallback(() => {
        if (!results) return;

        const allResults = results.map(({ type, result }) =>
            `${t(`tools.caseConverter.types.${type}`)}:\n${result}`
        ).join('\n\n');

        copy(allResults);
    }, [results, copy, t]);

    // 处理清空
    const handleClear = useCallback(() => {
        setInput('');
    }, []);

    // 保存历史记录
    useEffect(() => {
        if (input.trim()) {
            const timer = setTimeout(() => {
                addToHistory(input, {
                    output: results?.[0]?.result,
                    mode: batchMode ? 'batch' : 'single',
                });
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [addToHistory, batchMode, input, results]);

    return (
        <ToolCard
            tool={TOOL_METADATA[ToolId.CASE_CONVERTER]}
            isExpanded={isExpanded}
            onToggleExpand={onToggleExpand}
        >
            <div className="h-full flex flex-col gap-4">
                {/* 输入区域 */}
                <div className="flex flex-col gap-2 flex-shrink-0">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                        <label className="block text-sm font-medium nb-text">
                            {t('tools.caseConverter.input')}
                        </label>
                        <div className="flex gap-2 items-center flex-wrap">
                            {/* 批量模式切换 */}
                            <label className="flex items-center gap-1.5 text-xs nb-text-secondary cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={batchMode}
                                    onChange={e => setBatchMode(e.target.checked)}
                                    className="nb-checkbox"
                                />
                                {t('tools.caseConverter.batchMode')}
                            </label>

                            <div className="w-px h-4 nb-border-r mx-1"></div>

                            <InputHistoryDropdown
                                toolId="case-converter"
                                onSelect={handleHistorySelect}
                                onSelectOutput={handleHistorySelect}
                            />
                            <button
                                onClick={handleClear}
                                className="nb-btn nb-btn-ghost text-sm"
                                disabled={!input}
                            >
                                {t('tools.caseConverter.clear')}
                            </button>
                        </div>
                    </div>
                    <textarea
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        placeholder={batchMode
                            ? t('tools.caseConverter.batchPlaceholder')
                            : t('tools.caseConverter.inputPlaceholder')
                        }
                        className="nb-input font-mono text-sm resize-none h-20"
                    />

                    {/* 文本统计 */}
                    {textStats && (
                        <div className="flex gap-4 text-xs nb-text-secondary">
                            <span>{t('tools.caseConverter.stats.chars')}: {textStats.chars}</span>
                            <span>{t('tools.caseConverter.stats.charsNoSpaces')}: {textStats.charsNoSpaces}</span>
                            <span>{t('tools.caseConverter.stats.words')}: {textStats.words}</span>
                            {batchMode && (
                                <span>{t('tools.caseConverter.stats.lines')}: {textStats.lines}</span>
                            )}
                        </div>
                    )}
                </div>

                {/* 操作按钮 */}
                {results && (
                    <div className="flex gap-2 flex-shrink-0">
                        <button
                            onClick={handleCopyAll}
                            className="nb-btn nb-btn-secondary text-sm"
                        >
                            <span className="material-symbols-outlined text-sm mr-1">copy_all</span>
                            {t('tools.caseConverter.copyAll')}
                        </button>
                    </div>
                )}

                {/* 结果区域 */}
                <div className="flex-1 overflow-y-auto">
                    {results ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {results.map(({ type, result }) => (
                                <div
                                    key={type}
                                    className="nb-card p-3 flex flex-col gap-2"
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-medium nb-text-secondary">
                                            {t(`tools.caseConverter.types.${type}`)}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => handleCopy(result)}
                                            className="nb-btn nb-btn-ghost min-h-11 min-w-11 text-xs p-1"
                                            title={t('tools.caseConverter.copy')}
                                            aria-label={t('tools.caseConverter.copy')}
                                        >
                                            <span className="material-symbols-outlined text-sm" aria-hidden="true">content_copy</span>
                                        </button>
                                    </div>
                                    <code className={`text-sm nb-text font-mono break-all bg-[var(--nb-bg)] p-2 rounded ${batchMode ? 'whitespace-pre-wrap' : ''}`}>
                                        {result}
                                    </code>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-full">
                            <p className="text-sm nb-text-secondary">
                                {t('tools.caseConverter.emptyHint')}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </ToolCard>
    );
};
