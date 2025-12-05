import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ToolId, getToolMetadata } from '../types/tools';
import { useToast } from '../hooks/useToast';

interface ToolOrderConfigProps {
  toolOrder: ToolId[];
  enabledTools: ToolId[];
  onOrderChange: (newOrder: ToolId[]) => void;
  onReset?: () => void;
}

/**
 * 工具顺序配置组件
 * 提供拖拽排序功能，用于工具管理弹窗中
 */
export const ToolOrderConfig: React.FC<ToolOrderConfigProps> = ({
  toolOrder,
  enabledTools,
  onOrderChange,
  onReset,
}) => {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // 只显示启用的工具，按顺序排列
  const orderedEnabledTools = toolOrder.filter(id => enabledTools.includes(id));

  const handleDragStart = useCallback((e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOverIndex(null);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent, toIndex: number) => {
      e.preventDefault();
      const fromIndex = parseInt(e.dataTransfer.getData('text/plain'), 10);

      if (!isNaN(fromIndex) && fromIndex !== toIndex) {
        // 计算在完整 toolOrder 中的实际索引
        const fromToolId = orderedEnabledTools[fromIndex];
        const toToolId = orderedEnabledTools[toIndex];
        
        const actualFromIndex = toolOrder.indexOf(fromToolId);
        const actualToIndex = toolOrder.indexOf(toToolId);
        
        if (actualFromIndex !== -1 && actualToIndex !== -1) {
          const newOrder = [...toolOrder];
          const [movedItem] = newOrder.splice(actualFromIndex, 1);
          newOrder.splice(actualToIndex, 0, movedItem);
          onOrderChange(newOrder);
        }
      }

      setDraggedIndex(null);
      setDragOverIndex(null);
    },
    [toolOrder, orderedEnabledTools, onOrderChange]
  );

  const handleDragEnd = useCallback(() => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  }, []);

  const handleReset = useCallback(() => {
    onReset?.();
    showToast(t('tools.order.resetSuccess'), 'success');
  }, [onReset, showToast, t]);

  if (orderedEnabledTools.length === 0) {
    return (
      <div className="text-center py-4 nb-text-secondary">
        {t('tools.order.noTools')}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold nb-text">{t('tools.order.title')}</h3>
          <p className="text-sm nb-text-secondary">{t('tools.order.description')}</p>
        </div>
        {onReset && (
          <button
            onClick={handleReset}
            className="nb-btn nb-btn-secondary px-3 py-1.5 text-sm"
          >
            {t('tools.order.reset')}
          </button>
        )}
      </div>

      <div className="space-y-2 max-h-64 overflow-y-auto">
        {orderedEnabledTools.map((toolId, index) => {
          const metadata = getToolMetadata(toolId);
          const isDragging = draggedIndex === index;
          const isDragOver = dragOverIndex === index;

          return (
            <div
              key={toolId}
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, index)}
              onDragEnd={handleDragEnd}
              className={`
                flex items-center gap-3 p-3 rounded-lg
                border-[length:var(--nb-border-width)] border-[color:var(--nb-border)]
                transition-all duration-150 nb-bg-card
                ${isDragging ? 'opacity-50 border-dashed cursor-move' : ''}
                ${isDragOver ? 'border-[color:var(--nb-accent-yellow)] bg-[color:var(--nb-accent-yellow)]/10' : ''}
                cursor-move hover:shadow-[var(--nb-shadow-hover)]
              `}
            >
              <span className="material-symbols-outlined icon-linear nb-text-secondary">
                drag_indicator
              </span>
              <span className="material-symbols-outlined nb-text">
                {metadata.icon}
              </span>
              <span className="nb-text flex-1">{t(metadata.nameKey)}</span>
              <span className="text-xs nb-text-secondary">{index + 1}</span>
            </div>
          );
        })}
      </div>

      <p className="text-xs nb-text-secondary">{t('tools.order.hint')}</p>
    </div>
  );
};

export default ToolOrderConfig;
