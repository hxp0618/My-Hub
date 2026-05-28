import React from 'react';
import { useTranslation } from 'react-i18next';

export const HistoryItemSkeleton: React.FC = () => {
  const { t } = useTranslation();
  return (
    <div
      className="animate-pulse p-5 nb-border-b border-[color:var(--nb-border)]/30"
      role="status"
      aria-live="polite"
      aria-label={t('common.loading')}
    >
      <div className="flex items-center gap-4" aria-hidden="true">
        <div className="w-8 h-8 bg-[color:var(--color-skeleton)] border-2 border-[color:var(--color-skeleton-sub)]"></div>
        <div className="flex-1">
          <div className="h-4 bg-[color:var(--color-skeleton)] w-3/4 mb-3"></div>
          <div className="h-3 bg-[color:var(--color-skeleton-sub)] w-1/2"></div>
        </div>
        <div className="h-3 w-16 bg-[color:var(--color-skeleton-sub)]"></div>
      </div>
    </div>
  );
};

export const BookmarkTreeSkeleton: React.FC = () => {
  const { t } = useTranslation();
  return (
    <div
      className="animate-pulse space-y-3 p-4"
      role="status"
      aria-live="polite"
      aria-label={t('common.loading')}
    >
      {[...Array(8)].map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-2" aria-hidden="true">
          <div className="w-5 h-5 bg-[color:var(--color-skeleton)] border border-[color:var(--color-skeleton-sub)]"></div>
          <div
            className="h-4 bg-[color:var(--color-skeleton)]"
            style={{ width: `${50 + (i % 3) * 15}%` }}
          ></div>
        </div>
      ))}
    </div>
  );
};

export const SearchResultSkeleton: React.FC = () => {
  const { t } = useTranslation();
  return (
    <div className="space-y-4" role="status" aria-live="polite" aria-label={t('common.loading')}>
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          className="animate-pulse p-5 bg-[color:var(--nb-card)] border-2 border-[color:var(--nb-border)] rounded-[var(--nb-border-radius-md)]"
          aria-hidden="true"
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-[color:var(--color-skeleton)] border-2 border-[color:var(--color-skeleton-sub)]"></div>
            <div className="flex-1">
              <div className="h-5 bg-[color:var(--color-skeleton)] w-2/3 mb-3"></div>
              <div className="h-3 bg-[color:var(--color-skeleton-sub)] w-1/2"></div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export const Spinner: React.FC<{
  size?: 'sm' | 'md' | 'lg';
  message?: string;
}> = ({ size = 'md', message }) => {
  const { t } = useTranslation();
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-12 h-12',
    lg: 'w-16 h-16'
  };

  const borderClasses = {
    sm: 'border-2',
    md: 'border-4',
    lg: 'border-4'
  };

  return (
    <div
      className="flex flex-col items-center justify-center gap-4"
      role="status"
      aria-live="polite"
      aria-label={message || t('common.loading')}
    >
      {/* Neo-Brutalism 风格加载器 - 方形旋转 */}
      <div className="relative" aria-hidden="true">
        <div className={`${sizeClasses[size]} ${borderClasses[size]} border-[color:var(--nb-border)]/20`}></div>
        <div className={`absolute inset-0 ${borderClasses[size]} border-[color:var(--nb-accent-yellow)] border-t-transparent animate-spin`}></div>
      </div>
      {message && (
        <div className="text-sm font-bold nb-text-secondary uppercase tracking-wide">{message}</div>
      )}
    </div>
  );
};
