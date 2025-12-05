import React, { createContext, useContext, useState } from 'react';
import { ToastContainer } from '../components/Toast';
import type { ToastType } from '../components/Toast';

interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
  actionText?: string;
  onAction?: () => void;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType, actionText?: string, onAction?: () => void) => void;
  success: (message: string, actionText?: string, onAction?: () => void) => void;
  error: (message: string, actionText?: string, onAction?: () => void) => void;
  warning: (message: string, actionText?: string, onAction?: () => void) => void;
  info: (message: string, actionText?: string, onAction?: () => void) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToastContext = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToastContext must be used within ToastProvider');
  }
  return context;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
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

  const value: ToastContextType = {
    showToast,
    success: (msg: string, actionText?: string, onAction?: () => void) =>
      showToast(msg, 'success', actionText, onAction),
    error: (msg: string, actionText?: string, onAction?: () => void) =>
      showToast(msg, 'error', actionText, onAction),
    warning: (msg: string, actionText?: string, onAction?: () => void) =>
      showToast(msg, 'warning', actionText, onAction),
    info: (msg: string, actionText?: string, onAction?: () => void) =>
      showToast(msg, 'info', actionText, onAction)
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
};
