import { useState } from 'react';
import type { ToastType } from '../components/Toast';

interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
  actionText?: string;
  onAction?: () => void;
}

export const useToast = () => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = (
    message: string,
    type: ToastType = 'info',
    actionText?: string,
    onAction?: () => void
  ) => {
    const id = Date.now().toString() + Math.random().toString(36);
    setToasts(prev => [...prev, { id, message, type, actionText, onAction }]);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  return {
    toasts,
    showToast,
    removeToast,
    success: (msg: string, actionText?: string, onAction?: () => void) =>
      showToast(msg, 'success', actionText, onAction),
    error: (msg: string, actionText?: string, onAction?: () => void) =>
      showToast(msg, 'error', actionText, onAction),
    warning: (msg: string, actionText?: string, onAction?: () => void) =>
      showToast(msg, 'warning', actionText, onAction),
    info: (msg: string, actionText?: string, onAction?: () => void) =>
      showToast(msg, 'info', actionText, onAction)
  };
};
