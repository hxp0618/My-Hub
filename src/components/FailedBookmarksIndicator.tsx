import React, { useState } from 'react';

interface FailedBookmarksIndicatorProps {
  failureCount: number;
  onRetryClick: () => void;
}

export const FailedBookmarksIndicator: React.FC<FailedBookmarksIndicatorProps> = ({
  failureCount,
  onRetryClick,
}) => {
  const [showTooltip, setShowTooltip] = useState(false);

  if (failureCount === 0) {
    return null;
  }

  return (
    <div className="relative inline-block">
      <button
        onClick={onRetryClick}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-error-light text-error hover:opacity-90 transition-theme text-sm"
      >
        <span className="material-symbols-outlined text-base text-error">warning</span>
        <span className="font-medium">{failureCount} 个标签生成失败</span>
        <span className="material-symbols-outlined text-base">refresh</span>
      </button>

      {/* Tooltip */}
      {showTooltip && (
        <div className="nb-card-static absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 text-xs whitespace-nowrap z-50">
          点击重新生成失败的标签
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
            <div className="border-4 border-transparent" style={{ borderTopColor: 'var(--nb-border)' }}></div>
          </div>
        </div>
      )}
    </div>
  );
};
