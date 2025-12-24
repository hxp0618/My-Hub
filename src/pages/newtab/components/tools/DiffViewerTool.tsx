import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ToolCard } from '../../../../components/ToolCard';
import { TOOL_METADATA, ToolId, ToolComponentProps } from '../../../../types/tools';
import * as Diff from 'diff';

export type DiffMode = 'side-by-side' | 'inline';

export interface DiffChange {
  value: string;
  added?: boolean;
  removed?: boolean;
}

/**
 * 计算文本差异（字符级别）
 */
export const computeDiff = (textA: string, textB: string): DiffChange[] => {
  return Diff.diffChars(textA, textB);
};

/**
 * 检查两段文本是否相同
 */
export const areTextsIdentical = (textA: string, textB: string): boolean => {
  return textA === textB;
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

  // 计算差异
  const diff = useMemo(() => computeDiff(textA, textB), [textA, textB]);
  const isIdentical = useMemo(() => areTextsIdentical(textA, textB), [textA, textB]);

  const handleClear = () => {
    setTextA('');
    setTextB('');
  };

  // 差异高亮样式 - 只高亮有差异的字符，使用更浅的背景色
  const addedStyle = {
    backgroundColor: 'rgba(94, 224, 168, 0.3)', // 浅绿色背景
    color: 'inherit',
    borderRadius: '2px',
  };
  
  const removedStyle = {
    backgroundColor: 'rgba(247, 113, 167, 0.3)', // 浅粉色背景
    color: 'inherit',
    textDecoration: 'line-through',
    borderRadius: '2px',
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
            style={part.added ? addedStyle : part.removed ? removedStyle : undefined}
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
          <span key={`l-${index}`} style={removedStyle}>
            {part.value}
          </span>
        );
      } else if (part.added) {
        // 新增的内容只显示在右边，带高亮
        rightContent.push(
          <span key={`r-${index}`} style={addedStyle}>
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

          <div className="flex gap-2 text-xs">
            <span className="nb-badge nb-badge-green">
              {t('tools.diffViewer.added')}
            </span>
            <span className="nb-badge nb-badge-pink">
              {t('tools.diffViewer.removed')}
            </span>
          </div>

          <button
            onClick={handleClear}
            className="ml-auto nb-btn nb-btn-ghost text-sm"
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
