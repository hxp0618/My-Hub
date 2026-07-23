import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useInputHistory, HistoryItem } from '../hooks/useInputHistory';

/**
 * InputHistoryDropdown 组件属性
 */
export interface InputHistoryDropdownProps {
  /** 工具 ID */
  toolId: string;
  /** 选择历史记录时的回调 */
  onSelect: (content: string) => void;
  /** 使用历史输出作为新输入 */
  onSelectOutput?: (output: string) => void;
  /** 自定义类名 */
  className?: string;
}

/**
 * 输入历史记录下拉组件
 * 
 * 显示工具的输入历史记录，支持选择、删除和清空操作
 */
export const InputHistoryDropdown: React.FC<InputHistoryDropdownProps> = ({
  toolId,
  onSelect,
  onSelectOutput,
  className = '',
}) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const { history, selectFromHistory, clearHistory, removeFromHistory, togglePinned } = useInputHistory({
    toolId,
  });

  // 点击外部关闭下拉菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // 处理选择历史记录
  const handleSelect = (item: HistoryItem) => {
    const content = selectFromHistory(item.id);
    if (content) {
      onSelect(content);
    }
    setIsOpen(false);
  };

  // 处理删除单条记录
  const handleRemove = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    removeFromHistory(id);
  };

  // 处理清空所有记录
  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    clearHistory();
    setIsOpen(false);
  };

  // 格式化时间戳
  const formatTime = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  // 截断内容显示
  const truncateContent = (content: string, maxLength: number = 50): string => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  };

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      {/* 触发按钮 */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={history.length === 0}
        className="nb-btn nb-btn-secondary p-2 h-10 w-10 justify-center disabled:cursor-not-allowed"
        title={t('tools.common.history')}
        aria-label={t('tools.common.history')}
        aria-expanded={isOpen}
        aria-haspopup="menu"
      >
        <span className="material-symbols-outlined text-sm" aria-hidden="true">history</span>
      </button>

      {/* 下拉菜单 */}
      {isOpen && history.length > 0 && (
        <div
          className="nb-dropdown absolute right-0 top-full mt-1 w-96 max-w-[min(24rem,calc(100vw-2rem))] max-h-96 overflow-auto z-50"
          role="menu"
          aria-label={t('tools.common.history')}
        >
          {/* 头部 */}
          <div className="flex items-center justify-between px-3 py-2 nb-border-b">
            <span className="text-sm font-medium nb-text">
              {t('tools.common.history')}
            </span>
            <button
              type="button"
              onClick={handleClear}
              className="text-xs text-[color:var(--nb-accent-pink)] hover:underline"
            >
              {t('tools.common.clearAll')}
            </button>
          </div>

          {/* 历史记录列表 */}
          <div className="py-1">
            {history.map((item) => (
              <div
                key={item.id}
                className="nb-dropdown-item flex items-start gap-2 group"
              >
                <button
                  type="button"
                  onClick={() => handleSelect(item)}
                  className="min-w-0 flex-1 text-left"
                  title={t('tools.common.reuseInput')}
                >
                  <p className="text-sm nb-text truncate font-mono">
                    {truncateContent(item.content)}
                  </p>
                  {item.output && (
                    <p className="mt-0.5 truncate text-xs nb-text-secondary font-mono">
                      → {truncateContent(item.output, 42)}
                    </p>
                  )}
                  {item.mode && (
                    <span className="mt-1 inline-block border border-[color:var(--nb-border)] px-1 text-xs nb-text-secondary">
                      {item.mode}
                    </span>
                  )}
                  <p className="text-xs nb-text-secondary mt-0.5">
                    {formatTime(item.timestamp)}
                  </p>
                </button>
                {item.output && onSelectOutput && (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onSelectOutput(item.output as string);
                      setIsOpen(false);
                    }}
                    className="nb-btn-ghost inline-flex min-h-11 min-w-11 items-center justify-center p-1"
                    aria-label={t('tools.common.reuseOutput')}
                    title={t('tools.common.reuseOutput')}
                  >
                    <span className="material-symbols-outlined text-sm" aria-hidden="true">redo</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    togglePinned(item.id);
                  }}
                  className="nb-btn-ghost inline-flex min-h-11 min-w-11 items-center justify-center p-1"
                  aria-label={t(item.pinned ? 'tools.common.unpin' : 'tools.common.pin')}
                  title={t(item.pinned ? 'tools.common.unpin' : 'tools.common.pin')}
                >
                  <span className="material-symbols-outlined text-sm" aria-hidden="true">{item.pinned ? 'keep_off' : 'keep'}</span>
                </button>
                <button
                  type="button"
                  onClick={(e) => handleRemove(e, item.id)}
                  className="nb-btn-ghost inline-flex min-h-11 min-w-11 items-center justify-center rounded p-1"
                  title={t('tools.common.delete')}
                  aria-label={t('tools.common.delete')}
                >
                  <span className="material-symbols-outlined text-xs nb-text-secondary" aria-hidden="true">
                    close
                  </span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default InputHistoryDropdown;
