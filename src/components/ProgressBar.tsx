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
        <div className="text-sm nb-text-secondary mb-2">{message}</div>
      )}
      <div className="w-full nb-bg-card border-[length:var(--nb-border-width)] border-[color:var(--nb-border)] rounded-full h-3 overflow-hidden">
        <div
          className={`${variantColors[variant]} h-full rounded-full transition-all duration-300 ease-out`}
          style={{ width: `${clampedProgress}%` }}
          role="progressbar"
          aria-valuenow={clampedProgress}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
      {showPercentage && (
        <div className="text-xs nb-text-secondary mt-1 text-right">
          {Math.round(clampedProgress)}%
        </div>
      )}
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
  strokeWidth = 8,
  message
}) => {
  const clampedProgress = Math.min(100, Math.max(0, progress));
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (clampedProgress / 100) * circumference;

  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <div className="relative" style={{ width: size, height: size }}>
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
            opacity={0.3}
          />
          {/* Progress circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="var(--nb-accent-yellow)"
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-300"
          />
        </svg>
        {/* Percentage text in center */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xl font-semibold nb-text">
            {Math.round(clampedProgress)}%
          </span>
        </div>
      </div>
      {message && (
        <div className="text-sm nb-text-secondary text-center">{message}</div>
      )}
    </div>
  );
};
