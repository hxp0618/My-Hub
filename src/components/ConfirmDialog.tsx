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
        className="nb-card-static p-6 max-w-md w-full mx-4 animate-modal-appear"
        onClick={(e) => e.stopPropagation()}
        tabIndex={-1}
      >
        <h3 id="dialog-title" className="text-lg font-semibold mb-3 nb-text">
          {title}
        </h3>
        <p id="dialog-description" className="nb-text-secondary mb-6">
          {message}
        </p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="nb-btn nb-btn-secondary px-4 py-2"
            autoFocus={!danger}
          >
            {cancelLabel}
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`nb-btn px-4 py-2 ${
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
