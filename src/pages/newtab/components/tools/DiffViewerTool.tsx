import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ToolCard } from '../../../../components/ToolCard';
import { TOOL_METADATA, ToolId, ToolComponentProps } from '../../../../types/tools';
import * as Diff from 'diff';

export type DiffMode = 'side-by-side' | 'inline';
export type DiffGranularity = 'char' | 'word' | 'line';

export interface DiffChange {
  value: string;
  added?: boolean;
  removed?: boolean;
}

export interface DiffOptions {
  ignoreWhitespace?: boolean;
  ignoreCase?: boolean;
}

export const DIFF_HIGHLIGHT_STYLES: Record<'added' | 'removed', React.CSSProperties> = {
  added: {
    backgroundColor: 'color-mix(in srgb, var(--nb-accent-green) 30%, transparent)',
    color: 'inherit',
    borderRadius: '2px',
  },
  removed: {
    backgroundColor: 'color-mix(in srgb, var(--nb-accent-pink) 30%, transparent)',
    color: 'inherit',
    textDecoration: 'line-through',
    borderRadius: '2px',
  },
};

/**
 * 根据忽略选项规范化文本。
 */
export const normalizeDiffText = (text: string, options: DiffOptions = {}): string => {
  let normalized = text;
  if (options.ignoreWhitespace) {
    normalized = normalized.replace(/\s+/g, ' ').trim();
  }
  if (options.ignoreCase) {
    normalized = normalized.toLowerCase();
  }
  return normalized;
};

/**
 * 计算文本差异（字符级别）
 */
export const computeDiff = (
  textA: string,
  textB: string,
  granularity: DiffGranularity = 'char',
  options: DiffOptions = {}
): DiffChange[] => {
  const normalizedA = normalizeDiffText(textA, options);
  const normalizedB = normalizeDiffText(textB, options);

  switch (granularity) {
    case 'line':
      return Diff.diffLines(normalizedA, normalizedB);
    case 'word':
      return Diff.diffWordsWithSpace(normalizedA, normalizedB);
    case 'char':
    default:
      return Diff.diffChars(normalizedA, normalizedB);
  }
};

/**
 * 检查两段文本是否相同
 */
export const areTextsIdentical = (textA: string, textB: string, options: DiffOptions = {}): boolean => {
  return normalizeDiffText(textA, options) === normalizeDiffText(textB, options);
};

/**
 * Diff 对比工具组件
 */
export const DiffViewerTool: React.FC<ToolComponentProps> = ({
  isExpanded,
  onToggleExpand,
}) => {
  const { t } = useTranslation();
  const [textA, setTextA] = useState('');
  const [textB, setTextB] = useState('');
  const [mode, setMode] = useState<DiffMode>('side-by-side');
  const [granularity, setGranularity] = useState<DiffGranularity>('char');
  const [ignoreWhitespace, setIgnoreWhitespace] = useState(false);
  const [ignoreCase, setIgnoreCase] = useState(false);

  // 计算差异
  const diffOptions = useMemo(
    () => ({ ignoreWhitespace, ignoreCase }),
    [ignoreCase, ignoreWhitespace]
  );
  const diff = useMemo(
    () => computeDiff(textA, textB, granularity, diffOptions),
    [diffOptions, granularity, textA, textB]
  );
  const isIdentical = useMemo(
    () => areTextsIdentical(textA, textB, diffOptions),
    [diffOptions, textA, textB]
  );

  const handleClear = () => {
    setTextA('');
    setTextB('');
  };

  const handleSwap = () => {
    setTextA(textB);
    setTextB(textA);
  };

  // 渲染行内差异
  const renderInlineDiff = () => {
    if (!textA && !textB) return null;
    if (isIdentical && textA) {
      return (
        <div className="p-4 text-center" style={{ color: 'var(--nb-accent-green)' }}>
          <span className="material-symbols-outlined text-2xl mb-2">check_circle</span>
          <p>{t('tools.diffViewer.noDifference')}</p>
        </div>
      );
    }

    return (
      <div className="p-3 font-mono text-sm whitespace-pre-wrap nb-text">
        {diff.map((part, index) => (
          <span
            key={index}
            style={part.added ? DIFF_HIGHLIGHT_STYLES.added : part.removed ? DIFF_HIGHLIGHT_STYLES.removed : undefined}
          >
            {part.value}
          </span>
        ))}
      </div>
    );
  };

  // 渲染并排差异 - 左边显示删除，右边显示新增
  const renderSideBySideDiff = () => {
    if (!textA && !textB) return null;
    if (isIdentical && textA) {
      return (
        <div className="p-4 text-center col-span-2" style={{ color: 'var(--nb-accent-green)' }}>
          <span className="material-symbols-outlined text-2xl mb-2">check_circle</span>
          <p>{t('tools.diffViewer.noDifference')}</p>
        </div>
      );
    }

    // 构建左右两边的内容
    const leftContent: React.ReactNode[] = [];
    const rightContent: React.ReactNode[] = [];

    diff.forEach((part, index) => {
      if (part.removed) {
        // 删除的内容只显示在左边，带高亮
        leftContent.push(
          <span key={`l-${index}`} style={DIFF_HIGHLIGHT_STYLES.removed}>
            {part.value}
          </span>
        );
      } else if (part.added) {
        // 新增的内容只显示在右边，带高亮
        rightContent.push(
          <span key={`r-${index}`} style={DIFF_HIGHLIGHT_STYLES.added}>
            {part.value}
          </span>
        );
      } else {
        // 相同的内容两边都显示
        leftContent.push(
          <span key={`l-${index}`}>{part.value}</span>
        );
        rightContent.push(
          <span key={`r-${index}`}>{part.value}</span>
        );
      }
    });

    return (
      <>
        <div className="font-mono text-sm whitespace-pre-wrap overflow-auto p-3 nb-text">
          {leftContent}
        </div>
        <div className="font-mono text-sm whitespace-pre-wrap overflow-auto p-3 nb-text nb-border-l">
          {rightContent}
        </div>
      </>
    );
  };

  return (
    <ToolCard
      tool={TOOL_METADATA[ToolId.DIFF_VIEWER]}
      isExpanded={isExpanded}
      onToggleExpand={onToggleExpand}
    >
      <div className="h-full flex flex-col gap-4">
        {/* 控制区 */}
        <div className="flex items-center gap-4 flex-shrink-0">
          <div className="flex items-center gap-2">
            <label className="text-sm nb-text-secondary">{t('tools.diffViewer.mode')}:</label>
            <select
              value={mode}
              onChange={e => setMode(e.target.value as DiffMode)}
              className="nb-input text-sm"
            >
              <option value="side-by-side">{t('tools.diffViewer.sideBySide')}</option>
              <option value="inline">{t('tools.diffViewer.inline')}</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm nb-text-secondary">{t('tools.diffViewer.granularity')}:</label>
            <select
              value={granularity}
              onChange={e => setGranularity(e.target.value as DiffGranularity)}
              className="nb-input text-sm"
            >
              <option value="char">{t('tools.diffViewer.charLevel')}</option>
              <option value="word">{t('tools.diffViewer.wordLevel')}</option>
              <option value="line">{t('tools.diffViewer.lineLevel')}</option>
            </select>
          </div>

          <div className="flex gap-2 text-xs">
            <span className="nb-badge nb-badge-green">
              {t('tools.diffViewer.added')}
            </span>
            <span className="nb-badge nb-badge-pink">
              {t('tools.diffViewer.removed')}
            </span>
          </div>

          <label className="flex items-center gap-1 cursor-pointer">
            <input
              type="checkbox"
              checked={ignoreWhitespace}
              onChange={e => setIgnoreWhitespace(e.target.checked)}
              className="w-4 h-4 rounded nb-border accent-[var(--nb-accent-yellow)]"
            />
            <span className="text-sm nb-text-secondary">{t('tools.diffViewer.ignoreWhitespace')}</span>
          </label>

          <label className="flex items-center gap-1 cursor-pointer">
            <input
              type="checkbox"
              checked={ignoreCase}
              onChange={e => setIgnoreCase(e.target.checked)}
              className="w-4 h-4 rounded nb-border accent-[var(--nb-accent-yellow)]"
            />
            <span className="text-sm nb-text-secondary">{t('tools.diffViewer.ignoreCase')}</span>
          </label>

          <button
            onClick={handleSwap}
            className="ml-auto nb-btn nb-btn-secondary text-sm"
          >
            {t('tools.diffViewer.swap')}
          </button>

          <button
            onClick={handleClear}
            className="nb-btn nb-btn-ghost text-sm"
          >
            {t('tools.diffViewer.clear')}
          </button>
        </div>

        {/* 输入区 */}
        <div className="grid grid-cols-2 gap-4 flex-shrink-0">
          <div>
            <label className="block text-sm font-medium nb-text mb-2">
              {t('tools.diffViewer.textA')}
            </label>
            <textarea
              value={textA}
              onChange={e => setTextA(e.target.value)}
              placeholder={t('tools.diffViewer.textAPlaceholder')}
              rows={6}
              className="nb-input w-full font-mono text-sm resize-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium nb-text mb-2">
              {t('tools.diffViewer.textB')}
            </label>
            <textarea
              value={textB}
              onChange={e => setTextB(e.target.value)}
              placeholder={t('tools.diffViewer.textBPlaceholder')}
              rows={6}
              className="nb-input w-full font-mono text-sm resize-none"
            />
          </div>
        </div>

        {/* 差异显示区 */}
        <div
          className={`flex-1 nb-card-static overflow-auto min-h-[200px] ${
            mode === 'side-by-side' ? 'grid grid-cols-2' : ''
          }`}
        >
          {mode === 'inline' ? renderInlineDiff() : renderSideBySideDiff()}
        </div>
      </div>
    </ToolCard>
  );
};
