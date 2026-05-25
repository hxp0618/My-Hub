import React from 'react';

interface ProgressBarProps {
  progress: number; // 0-100
  message?: string;
  showPercentage?: boolean;
  variant?: 'default' | 'success' | 'warning' | 'error';
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  message,
  showPercentage = true,
  variant = 'default'
}) => {
  const clampedProgress = Math.min(100, Math.max(0, progress));

  const variantColors = {
    default: 'bg-[color:var(--nb-accent-yellow)]',
    success: 'bg-[color:var(--nb-accent-green)]',
    warning: 'bg-[color:var(--nb-accent-yellow)]',
    error: 'bg-[color:var(--nb-accent-pink)]'
  };

  return (
    <div className="w-full">
      {message && (
        <div className="text-sm font-medium nb-text-secondary mb-3 uppercase tracking-wide">{message}</div>
      )}
      {/* Neo-Brutalism 风格进度条 - 无圆角，有硬阴影 */}
      <div className="relative">
        <div className="w-full nb-bg-card border-3 border-[color:var(--nb-border)] h-6 overflow-hidden shadow-[3px_3px_0px_0px_var(--nb-border)]">
          <div
            className={`${variantColors[variant]} h-full transition-all duration-300 ease-out relative`}
            style={{ width: `${clampedProgress}%` }}
            role="progressbar"
            aria-valuenow={clampedProgress}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            {/* 进度条内的条纹装饰 */}
            <div 
              className="absolute inset-0 opacity-30"
              style={{
                backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(0,0,0,0.1) 4px, rgba(0,0,0,0.1) 8px)'
              }}
            ></div>
          </div>
        </div>
        {/* 百分比显示 - Neo-Brutalism 风格 */}
        {showPercentage && (
          <div className="absolute right-0 top-full mt-2">
            <span className="inline-block px-2 py-1 bg-[color:var(--nb-card)] border-2 border-[color:var(--nb-border)] shadow-[2px_2px_0px_0px_var(--nb-border)] text-xs font-bold nb-text">
              {Math.round(clampedProgress)}%
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

interface CircularProgressProps {
  progress: number; // 0-100
  size?: number;
  strokeWidth?: number;
  message?: string;
}

export const CircularProgress: React.FC<CircularProgressProps> = ({
  progress,
  size = 120,
  strokeWidth = 10,
  message
}) => {
  const clampedProgress = Math.min(100, Math.max(0, progress));
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (clampedProgress / 100) * circumference;

  return (
    <div className="flex flex-col items-center justify-center gap-4">
      {/* Neo-Brutalism 风格圆形进度 */}
      <div 
        className="relative border-4 border-[color:var(--nb-border)] shadow-[6px_6px_0px_0px_var(--nb-border)] bg-[color:var(--nb-card)]" 
        style={{ width: size + 16, height: size + 16, padding: 8 }}
      >
        <svg width={size} height={size} className="transform -rotate-90">
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="var(--nb-border)"
            strokeWidth={strokeWidth}
            fill="none"
            className="transition-colors"
            opacity={0.2}
          />
          {/* Progress circle - Neo-Brutalism 使用直线端点 */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="var(--nb-accent-yellow)"
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="butt"
            className="transition-all duration-300"
          />
        </svg>
        {/* Percentage text in center - Neo-Brutalism 风格 */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="px-3 py-1 bg-[color:var(--nb-accent-yellow)] border-2 border-[color:var(--nb-border)] shadow-[2px_2px_0px_0px_var(--nb-border)]">
            <span className="text-lg font-black nb-text uppercase">
              {Math.round(clampedProgress)}%
            </span>
          </div>
        </div>
      </div>
      {message && (
        <div className="text-sm font-medium nb-text-secondary text-center uppercase tracking-wide">{message}</div>
      )}
    </div>
  );
};
