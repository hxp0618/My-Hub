import React from 'react';
import { useTranslation } from 'react-i18next';

interface BatchModeToggleProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
}

export const BatchModeToggle: React.FC<BatchModeToggleProps> = ({ enabled, onChange }) => {
  const { t } = useTranslation();

  return (
    <label className="flex items-center gap-2 cursor-pointer select-none">
      <input
        type="checkbox"
        checked={enabled}
        onChange={e => onChange(e.target.checked)}
        className="w-4 h-4 rounded nb-border accent-[var(--nb-accent-yellow)] cursor-pointer"
      />
      <span className="text-sm nb-text-secondary">{t('tools.qrcodeGenerator.batchMode')}</span>
      {enabled && (
        <span className="text-xs nb-text-secondary">({t('tools.qrcodeGenerator.batchModeHint')})</span>
      )}
    </label>
  );
};
