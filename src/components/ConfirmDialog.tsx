import React, { useEffect, useId, useRef } from 'react';
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
  const titleId = useId();
  const descriptionId = useId();
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
      className="confirm-dialog-overlay modal-overlay"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        className="confirm-dialog nb-card-static animate-modal-appear"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        tabIndex={-1}
      >
        {/* 标题区域 */}
        <div className="confirm-dialog-header">
          <div className={`confirm-dialog-icon ${danger ? 'confirm-dialog-icon--danger' : 'confirm-dialog-icon--default'}`}>
            <span className="material-symbols-outlined text-xl nb-text" aria-hidden="true">
              {danger ? 'warning' : 'help'}
            </span>
          </div>
          <h3 id={titleId} className="confirm-dialog-title">
            {title}
          </h3>
        </div>

        {/* 消息内容 */}
        <p id={descriptionId} className="confirm-dialog-message">
          {message}
        </p>

        {/* 操作按钮 */}
        <div className="confirm-dialog-actions">
          <button
            type="button"
            onClick={onClose}
            className="nb-btn nb-btn-secondary confirm-dialog-button"
            autoFocus={!danger}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`nb-btn confirm-dialog-button ${
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
