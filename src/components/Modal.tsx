import React from 'react';
import { useTranslation } from 'react-i18next';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  widthClass?: string;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, widthClass = 'max-w-md' }) => {
  const { t } = useTranslation();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 modal-overlay flex items-center justify-center z-50 transition-theme" onClick={onClose}>
      <div className={`nb-card-static p-8 w-full ${widthClass} animate-modal-appear`} onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold nb-text">{title}</h3>
            <button 
              onClick={onClose} 
              className="nb-btn-ghost p-2 rounded-full"
              aria-label={t('common.close')}
            >
                <span className="material-symbols-outlined">close</span>
            </button>
        </div>
        {children}
      </div>
    </div>
  );
};
