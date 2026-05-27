import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface FailedBookmarksIndicatorProps {
  failureCount: number;
  onRetryClick: () => void;
}

export const FailedBookmarksIndicator: React.FC<FailedBookmarksIndicatorProps> = ({
  failureCount,
  onRetryClick,
}) => {
  const { t } = useTranslation();
  const [showTooltip, setShowTooltip] = useState(false);
  const retryLabel = t('bookmarks.failedTagsRetryLabel', { count: failureCount });
  const retryHint = t('bookmarks.failedTagsRetryHint');

  if (failureCount === 0) {
    return null;
  }

  return (
    <div className="relative inline-block">
      <button
        onClick={onRetryClick}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        aria-label={retryHint}
        title={retryHint}
        className="nb-btn nb-btn-danger flex items-center gap-2 px-3 py-1.5 text-sm"
      >
        <span className="material-symbols-outlined text-base text-error">warning</span>
        <span className="font-medium">{retryLabel}</span>
        <span className="material-symbols-outlined text-base">refresh</span>
      </button>

      {/* Tooltip */}
      {showTooltip && (
        <div className="nb-card-static absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 text-xs whitespace-nowrap z-50">
          {retryHint}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
            <div className="border-4 border-transparent" style={{ borderTopColor: 'var(--nb-border)' }}></div>
          </div>
        </div>
      )}
    </div>
  );
};
