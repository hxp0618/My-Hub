import React from 'react';
import { useTranslation } from 'react-i18next';

export interface ActionItem {
  label: string;
  onClick: () => void;
  className?: string;
  disabled?: boolean;
  icon?: string;
}

interface SelectionActionBarProps {
  selectionCount: number;
  actions: ActionItem[];
  onCancel: () => void;
}

export const SelectionActionBar = React.memo(function SelectionActionBar({
  selectionCount,
  actions,
  onCancel,
}: SelectionActionBarProps) {
  const { t } = useTranslation();
  
  if (selectionCount === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-10 left-1/2 -translate-x-1/2 nb-card-static px-6 py-4 flex items-center space-x-5 z-50 shadow-[8px_8px_0px_0px_var(--nb-border)] animate-fade-in-up">
      {/* 装饰性左边框 */}
      <div className="absolute left-0 top-0 bottom-0 w-2 bg-[color:var(--nb-accent-yellow)]"></div>
      
      {/* 选择计数徽章 */}
      <div className="flex items-center gap-2 ml-2">
        <div className="w-8 h-8 flex items-center justify-center bg-[color:var(--nb-accent-blue)] border-2 border-[color:var(--nb-border)] shadow-[2px_2px_0px_0px_var(--nb-border)]">
          <span className="material-symbols-outlined text-base nb-text">checklist</span>
        </div>
        <span className="text-sm font-bold nb-text uppercase tracking-wide">
          {t('history.selectedCount', { count: selectionCount })}
        </span>
      </div>
      
      {/* 分隔线 */}
      <div className="h-8 w-0.5 bg-[color:var(--nb-border)]"></div>
      
      {/* 操作按钮组 */}
      {actions.map((action, index) => (
        <button
          key={index}
          onClick={action.onClick}
          className={`nb-btn text-sm px-5 py-2.5 ${action.className || 'nb-btn-secondary'} ${action.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          disabled={action.disabled}
        >
          {action.icon && (
            <span className="material-symbols-outlined text-base mr-1.5">{action.icon}</span>
          )}
          {action.label}
        </button>
      ))}
      
      {/* 取消按钮 */}
      <button
        onClick={onCancel}
        className="w-10 h-10 flex items-center justify-center bg-[color:var(--nb-card)] border-3 border-[color:var(--nb-border)] shadow-[3px_3px_0px_0px_var(--nb-border)] hover:shadow-[1px_1px_0px_0px_var(--nb-border)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all duration-100"
        aria-label={t('common.cancel')}
      >
        <span className="material-symbols-outlined text-lg nb-text">close</span>
      </button>
    </div>
  );
});
