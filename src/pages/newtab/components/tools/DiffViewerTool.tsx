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
 * 计算文本差异
 */
export const computeDiff = (textA: string, textB: string): DiffChange[] => {
  return Diff.diffLines(textA, textB);
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
  const [mode, setMode] = useState<DiffMode>('inline');

  // 计算差异
  const diff = useMemo(() => computeDiff(textA, textB), [textA, textB]);
  const isIdentical = useMemo(() => areTextsIdentical(textA, textB), [textA, textB]);

  const handleClear = () => {
    setTextA('');
    setTextB('');
  };

  // 渲染行内差异
  const renderInlineDiff = () => {
    if (!textA && !textB) return null;
    if (isIdentical && textA) {
      return (
        <div className="p-4 text-center text-success">
          <span className="material-symbols-outlined text-2xl mb-2">check_circle</span>
          <p>{t('tools.diffViewer.noDifference')}</p>
        </div>
      );
    }

    return (
      <div className="p-3 font-mono text-sm whitespace-pre-wrap">
        {diff.map((part, index) => (
          <span
            key={index}
            className={
              part.added
                ? 'bg-green-200 dark:bg-green-900 text-green-800 dark:text-green-200'
                : part.removed
                  ? 'bg-red-200 dark:bg-red-900 text-red-800 dark:text-red-200 line-through'
                  : ''
            }
          >
            {part.value}
          </span>
        ))}
      </div>
    );
  };

  // 渲染并排差异
  const renderSideBySideDiff = () => {
    if (!textA && !textB) return null;
    if (isIdentical && textA) {
      return (
        <div className="p-4 text-center text-success col-span-2">
          <span className="material-symbols-outlined text-2xl mb-2">check_circle</span>
          <p>{t('tools.diffViewer.noDifference')}</p>
        </div>
      );
    }

    const leftLines: React.ReactNode[] = [];
    const rightLines: React.ReactNode[] = [];

    diff.forEach((part, index) => {
      if (part.removed) {
        leftLines.push(
          <div key={`l-${index}`} className="bg-red-200 dark:bg-red-900 px-2">
            {part.value}
          </div>
        );
      } else if (part.added) {
        rightLines.push(
          <div key={`r-${index}`} className="bg-green-200 dark:bg-green-900 px-2">
            {part.value}
          </div>
        );
      } else {
        leftLines.push(
          <div key={`l-${index}`} className="px-2">
            {part.value}
          </div>
        );
        rightLines.push(
          <div key={`r-${index}`} className="px-2">
            {part.value}
          </div>
        );
      }
    });

    return (
      <>
        <div className="font-mono text-sm whitespace-pre-wrap overflow-auto">{leftLines}</div>
        <div className="font-mono text-sm whitespace-pre-wrap overflow-auto">{rightLines}</div>
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
              <option value="inline">{t('tools.diffViewer.inline')}</option>
              <option value="side-by-side">{t('tools.diffViewer.sideBySide')}</option>
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
            mode === 'side-by-side' ? 'grid grid-cols-2 divide-x nb-border-r' : ''
          }`}
        >
          {mode === 'inline' ? renderInlineDiff() : renderSideBySideDiff()}
        </div>
      </div>
    </ToolCard>
  );
};
