import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText,
  cancelText,
  danger = false
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const { t } = useTranslation();
  const confirmLabel = confirmText ?? t('common.confirm');
  const cancelLabel = cancelText ?? t('common.cancel');

  useEffect(() => {
    if (isOpen) {
      // Focus the dialog when it opens
      dialogRef.current?.focus();

      // Handle Escape key
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose();
        }
      };
      document.addEventListener('keydown', handleEscape);

      return () => {
        document.removeEventListener('keydown', handleEscape);
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 modal-overlay flex items-center justify-center z-50 transition-colors"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="dialog-title"
      aria-describedby="dialog-description"
    >
      <div
        ref={dialogRef}
        className="nb-card-static p-8 max-w-md w-full mx-4 animate-modal-appear shadow-[8px_8px_0px_0px_var(--nb-border)] relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        tabIndex={-1}
      >
        {/* 装饰性元素 */}
        <div className={`absolute -top-3 -right-3 w-12 h-12 ${danger ? 'bg-[color:var(--nb-accent-pink)]' : 'bg-[color:var(--nb-accent-yellow)]'} border-2 border-[color:var(--nb-border)] opacity-40 rounded-full pointer-events-none`}></div>
        <div className="absolute -bottom-4 -left-4 w-16 h-16 bg-[color:var(--nb-accent-blue)]/20 border-3 border-[color:var(--nb-border)]/30 nb-sticker-2 pointer-events-none" style={{ borderRadius: '30% 70% 70% 30% / 30% 30% 70% 70%' }}></div>

        {/* 标题区域 */}
        <div className="flex items-center gap-3 mb-4 relative z-10">
          <div className={`w-10 h-10 flex items-center justify-center ${danger ? 'bg-[color:var(--nb-accent-pink)]' : 'bg-[color:var(--nb-accent-yellow)]'} border-3 border-[color:var(--nb-border)] shadow-[3px_3px_0px_0px_var(--nb-border)]`}>
            <span className="material-symbols-outlined text-xl nb-text">
              {danger ? 'warning' : 'help'}
            </span>
          </div>
          <h3 id="dialog-title" className="text-xl font-black nb-text uppercase tracking-tight">
            {title}
          </h3>
        </div>

        {/* 消息内容 */}
        <div className="mb-6 pl-13 relative z-10">
          <p id="dialog-description" className="nb-text-secondary font-medium leading-relaxed">
            {message}
          </p>
        </div>

        {/* 操作按钮 */}
        <div className="flex justify-end gap-4 relative z-10">
          <button
            onClick={onClose}
            className="nb-btn nb-btn-secondary px-5 py-2.5"
            autoFocus={!danger}
          >
            {cancelLabel}
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`nb-btn px-5 py-2.5 ${
              danger
                ? 'nb-btn-danger'
                : 'nb-btn-primary'
            }`}
            autoFocus={danger}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
