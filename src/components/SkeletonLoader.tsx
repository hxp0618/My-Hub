import React from 'react';

export const HistoryItemSkeleton: React.FC = () => (
  <div className="animate-pulse p-4 nb-border-b">
    <div className="flex items-center gap-3">
      <div className="w-4 h-4 bg-[color:var(--nb-border)]/20 rounded"></div>
      <div className="w-4 h-4 bg-[color:var(--nb-border)]/20 rounded"></div>
      <div className="flex-1">
        <div className="h-4 bg-[color:var(--nb-border)]/20 rounded w-3/4 mb-2"></div>
        <div className="h-3 bg-[color:var(--nb-border)]/10 rounded w-1/2"></div>
      </div>
    </div>
  </div>
);

export const BookmarkTreeSkeleton: React.FC = () => (
  <div className="animate-pulse space-y-2">
    {[...Array(8)].map((_, i) => (
      <div key={i} className="flex items-center gap-2 p-2">
        <div className="w-4 h-4 bg-[color:var(--nb-border)]/20 rounded"></div>
        <div className="h-4 bg-[color:var(--nb-border)]/20 rounded flex-1" style={{ width: `${60 + Math.random() * 30}%` }}></div>
      </div>
    ))}
  </div>
);

export const SearchResultSkeleton: React.FC = () => (
  <div className="space-y-3">
    {[...Array(5)].map((_, i) => (
      <div key={i} className="animate-pulse p-3 nb-card-static">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[color:var(--nb-border)]/20 rounded"></div>
          <div className="flex-1">
            <div className="h-4 bg-[color:var(--nb-border)]/20 rounded w-2/3 mb-2"></div>
            <div className="h-3 bg-[color:var(--nb-border)]/10 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    ))}
  </div>
);

export const Spinner: React.FC<{
  size?: 'sm' | 'md' | 'lg';
  message?: string;
}> = ({ size = 'md', message }) => {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-4',
    lg: 'w-12 h-12 border-4'
  };

  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <div className={`${sizeClasses[size]} border-[color:var(--nb-border)]/30 border-t-[color:var(--nb-accent-yellow)] rounded-full animate-spin`} />
      {message && (
        <div className="text-sm nb-text-secondary">{message}</div>
      )}
    </div>
  );
};
