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
  className = '',
}) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const { history, selectFromHistory, clearHistory, removeFromHistory } = useInputHistory({
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
        onClick={() => setIsOpen(!isOpen)}
        disabled={history.length === 0}
        className="nb-btn nb-btn-secondary p-2 h-10 w-10 justify-center disabled:opacity-50 disabled:cursor-not-allowed"
        title={t('tools.common.history')}
      >
        <span className="material-symbols-outlined text-sm">history</span>
      </button>

      {/* 下拉菜单 */}
      {isOpen && history.length > 0 && (
        <div className="nb-dropdown absolute right-0 top-full mt-1 w-80 max-h-96 overflow-auto z-50">
          {/* 头部 */}
          <div className="flex items-center justify-between px-3 py-2 nb-border-b">
            <span className="text-sm font-medium nb-text">
              {t('tools.common.history')}
            </span>
            <button
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
                onClick={() => handleSelect(item)}
                className="nb-dropdown-item flex items-start gap-2 cursor-pointer group"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm nb-text truncate font-mono">
                    {truncateContent(item.content)}
                  </p>
                  <p className="text-xs nb-text-secondary mt-0.5">
                    {formatTime(item.timestamp)}
                  </p>
                </div>
                <button
                  onClick={(e) => handleRemove(e, item.id)}
                  className="nb-btn-ghost p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                  title={t('tools.common.delete')}
                >
                  <span className="material-symbols-outlined text-xs nb-text-secondary">
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
