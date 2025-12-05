import React from 'react';
import { useTranslation } from 'react-i18next';

export interface ActionItem {
  label: string;
  onClick: () => void;
  className?: string;
  disabled?: boolean;
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
    <div className="fixed bottom-10 left-1/2 -translate-x-1/2 nb-card-static px-6 py-4 flex items-center space-x-6 z-50">
      <span className="text-sm font-medium nb-text">
        {t('history.selectedCount', { count: selectionCount })}
      </span>
      <div className="h-6 border-l-[length:var(--nb-border-width)] border-[color:var(--nb-border)]"></div>
      {actions.map((action, index) => (
        <button
          key={index}
          onClick={action.onClick}
          className={`nb-btn text-sm font-semibold px-4 py-2 ${action.className || 'nb-btn-secondary'} ${action.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          disabled={action.disabled}
        >
          {action.label}
        </button>
      ))}
      <button
        onClick={onCancel}
        className="nb-btn nb-btn-ghost text-sm font-semibold px-4 py-2"
      >
        {t('common.cancel')}
      </button>
    </div>
  );
});
