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
    <div
      className="selection-action-bar nb-card-static animate-fade-in-up"
      role="toolbar"
      aria-label={t('history.selectedCount', { count: selectionCount })}
    >
      {/* 选择计数徽章 */}
      <div className="selection-action-bar-summary">
        <div className="selection-action-bar-icon">
          <span className="material-symbols-outlined text-base nb-text" aria-hidden="true">checklist</span>
        </div>
        <span className="selection-action-bar-count">
          {t('history.selectedCount', { count: selectionCount })}
        </span>
      </div>
      
      {/* 分隔线 */}
      <div className="selection-action-bar-divider" aria-hidden="true" />
      
      {/* 操作按钮组 */}
      <div className="selection-action-bar-actions">
        {actions.map((action, index) => (
          <button
            key={index}
            type="button"
            onClick={action.onClick}
            className={`nb-btn selection-action-bar-button ${action.className || 'nb-btn-secondary'} ${action.disabled ? 'cursor-not-allowed' : ''}`}
            disabled={action.disabled}
          >
            {action.icon && (
              <span className="material-symbols-outlined text-base" aria-hidden="true">{action.icon}</span>
            )}
            {action.label}
          </button>
        ))}
      </div>
      
      {/* 取消按钮 */}
      <button
        type="button"
        onClick={onCancel}
        className="selection-action-bar-close"
        aria-label={t('common.cancel')}
      >
        <span className="material-symbols-outlined text-lg nb-text" aria-hidden="true">close</span>
      </button>
    </div>
  );
});
