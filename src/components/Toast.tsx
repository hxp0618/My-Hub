import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastProps {
  message: string;
  type: ToastType;
  duration?: number;
  onClose: () => void;
  actionText?: string;
  onAction?: () => void;
}

export const Toast: React.FC<ToastProps> = ({
  message,
  type,
  duration = 5000,
  onClose,
  actionText,
  onAction
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const { t } = useTranslation();

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300);
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  // Neo-Brutalism 强调色
  const nbColors = {
    success: 'nb-badge-green',
    error: 'nb-badge-pink',
    warning: 'nb-badge-yellow',
    info: 'nb-badge-blue'
  };

  const icons = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ'
  };

  return (
    <div
      className={`
        nb-card-static ${nbColors[type]} px-4 py-3 
        flex items-center gap-3 min-w-[200px] max-w-sm transition-all duration-300
        ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'}
      `}
      role="alert"
      aria-live="polite"
    >
      <span className="text-xl nb-text flex-shrink-0" aria-hidden="true">{icons[type]}</span>
      <span className="flex-1 nb-text whitespace-nowrap">{message}</span>
      {actionText && onAction && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onAction();
          }}
          className="underline font-semibold hover:opacity-80 nb-text flex-shrink-0"
        >
          {actionText}
        </button>
      )}
      <button
        onClick={() => {
          setIsVisible(false);
          setTimeout(onClose, 300);
        }}
        className="text-xl hover:opacity-80 nb-text flex-shrink-0"
        aria-label={t('common.closeNotification')}
      >
        ×
      </button>
    </div>
  );
};

export const ToastContainer: React.FC<{
  toasts: Array<{ id: string; message: string; type: ToastType; actionText?: string; onAction?: () => void }>;
  onRemove: (id: string) => void;
}> = ({ toasts, onRemove }) => {
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((toast, index) => (
        <div key={toast.id} style={{ transform: `translateY(-${index * 80}px)` }}>
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => onRemove(toast.id)}
            actionText={toast.actionText}
            onAction={toast.onAction}
          />
        </div>
      ))}
    </div>
  );
};
