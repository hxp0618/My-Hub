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

  const toneClasses: Record<ToastType, string> = {
    success: 'toast--success',
    error: 'toast--error',
    warning: 'toast--warning',
    info: 'toast--info'
  };

  const icons = {
    success: 'check_circle',
    error: 'cancel',
    warning: 'warning',
    info: 'info'
  };

  return (
    <div
      className={`toast ${toneClasses[type]} ${isVisible ? 'toast--visible' : 'toast--hidden'}`}
      role={type === 'error' ? 'alert' : 'status'}
      aria-live={type === 'error' ? 'assertive' : 'polite'}
    >
      {/* 图标容器 - Neo-Brutalism 风格 */}
      <div className="toast-icon">
        <span className="material-symbols-outlined text-lg nb-text" aria-hidden="true">{icons[type]}</span>
      </div>
      
      {/* 消息内容 */}
      <span className="toast-message">{message}</span>
      
      {/* 操作按钮 */}
      {actionText && onAction && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onAction();
          }}
          className="toast-action"
        >
          {actionText}
        </button>
      )}
      
      {/* 关闭按钮 - Neo-Brutalism 风格 */}
      <button
        type="button"
        onClick={() => {
          setIsVisible(false);
          setTimeout(onClose, 300);
        }}
        className="toast-close"
        aria-label={t('common.closeNotification')}
      >
        <span className="material-symbols-outlined text-base nb-text" aria-hidden="true">close</span>
      </button>
    </div>
  );
};

export const ToastContainer: React.FC<{
  toasts: Array<{ id: string; message: string; type: ToastType; actionText?: string; onAction?: () => void }>;
  onRemove: (id: string) => void;
}> = ({ toasts, onRemove }) => {
  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onClose={() => onRemove(toast.id)}
          actionText={toast.actionText}
          onAction={toast.onAction}
        />
      ))}
    </div>
  );
};
