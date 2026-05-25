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

  // Neo-Brutalism 强调色背景
  const bgColors = {
    success: 'bg-[color:var(--nb-accent-green)]',
    error: 'bg-[color:var(--nb-accent-pink)]',
    warning: 'bg-[color:var(--nb-accent-yellow)]',
    info: 'bg-[color:var(--nb-accent-blue)]'
  };

  const icons = {
    success: 'check_circle',
    error: 'cancel',
    warning: 'warning',
    info: 'info'
  };

  return (
    <div
      className={`
        ${bgColors[type]} px-5 py-4
        border-3 border-[color:var(--nb-border)]
        shadow-[6px_6px_0px_0px_var(--nb-border)]
        flex items-center gap-4 min-w-[280px] max-w-md
        transition-all duration-300 ease-out
        ${isVisible 
          ? 'translate-y-0 opacity-100' 
          : 'translate-y-4 opacity-0 pointer-events-none'
        }
      `}
      role="alert"
      aria-live="polite"
    >
      {/* 图标容器 - Neo-Brutalism 风格 */}
      <div className="w-8 h-8 flex items-center justify-center bg-[color:var(--nb-card)] border-2 border-[color:var(--nb-border)] shadow-[2px_2px_0px_0px_var(--nb-border)] flex-shrink-0">
        <span className="material-symbols-outlined text-lg nb-text" aria-hidden="true">{icons[type]}</span>
      </div>
      
      {/* 消息内容 */}
      <span className="flex-1 font-bold text-sm nb-text uppercase tracking-wide">{message}</span>
      
      {/* 操作按钮 */}
      {actionText && onAction && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onAction();
          }}
          className="px-3 py-1.5 bg-[color:var(--nb-card)] border-2 border-[color:var(--nb-border)] shadow-[2px_2px_0px_0px_var(--nb-border)] hover:shadow-[1px_1px_0px_0px_var(--nb-border)] hover:translate-x-[1px] hover:translate-y-[1px] font-bold text-xs nb-text uppercase tracking-wide transition-all duration-100 flex-shrink-0"
        >
          {actionText}
        </button>
      )}
      
      {/* 关闭按钮 - Neo-Brutalism 风格 */}
      <button
        onClick={() => {
          setIsVisible(false);
          setTimeout(onClose, 300);
        }}
        className="w-7 h-7 flex items-center justify-center bg-[color:var(--nb-card)] border-2 border-[color:var(--nb-border)] shadow-[2px_2px_0px_0px_var(--nb-border)] hover:shadow-[1px_1px_0px_0px_var(--nb-border)] hover:translate-x-[1px] hover:translate-y-[1px] transition-all duration-100 flex-shrink-0"
        aria-label={t('common.closeNotification')}
      >
        <span className="material-symbols-outlined text-base nb-text">close</span>
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
