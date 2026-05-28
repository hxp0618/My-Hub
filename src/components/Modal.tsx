import React, { useEffect, useId, useRef } from 'react';
import { useTranslation } from 'react-i18next';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  widthClass?: string;
  closeOnBackdrop?: boolean;
  closeOnEscape?: boolean;
  showCloseButton?: boolean;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  widthClass = 'max-w-md',
  closeOnBackdrop = true,
  closeOnEscape = true,
  showCloseButton = true,
}) => {
  const { t } = useTranslation();
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    dialogRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (closeOnEscape && event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [closeOnEscape, isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 modal-overlay flex items-center justify-center z-50 transition-theme p-4"
      onClick={closeOnBackdrop ? onClose : undefined}
    >
      <div
        ref={dialogRef}
        className={`nb-card-static p-8 w-full ${widthClass} max-h-[calc(100dvh-2rem)] animate-modal-appear shadow-[var(--nb-shadow-modal)] relative overflow-hidden flex flex-col`}
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        {/* 标题区域 - 增强版 */}
        <div className="flex-shrink-0 flex justify-between items-start mb-6 pb-5 relative">
          {/* 装饰性背景条 */}
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-[color:var(--nb-deco-sky)] border-t-2 border-[color:var(--nb-border)]"></div>

          <div className="flex-1 relative z-10">
            <h3 id={titleId} className="text-2xl font-black nb-text uppercase tracking-tight inline-block relative">
              {title}
            </h3>
          </div>

          {showCloseButton && (
            <button
              onClick={onClose}
              className="flex-shrink-0 w-11 h-11 flex items-center justify-center bg-[color:var(--nb-card)] border-2 border-[color:var(--nb-border)] shadow-[var(--nb-shadow-sm)] hover:shadow-[var(--nb-shadow-xs)] hover:translate-x-[2px] hover:translate-y-[2px] active:shadow-none active:translate-x-[3px] active:translate-y-[3px] transition-all duration-100 relative z-10"
              aria-label={t('common.close')}
            >
              <span className="material-symbols-outlined text-xl nb-text" aria-hidden="true">close</span>
            </button>
          )}
        </div>

        <div className="nb-text relative z-10 min-h-0 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
};
