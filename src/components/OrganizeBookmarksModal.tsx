import React from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from './Modal';

interface OrganizeBookmarksModalProps {
  onClose: () => void;
  onConfirm: (action: 'export' | 'organize') => void;
  isLoading?: boolean;
}

export const OrganizeBookmarksModal: React.FC<OrganizeBookmarksModalProps> = ({ 
  onClose, 
  onConfirm, 
  isLoading = false 
}) => {
  const { t } = useTranslation();
  
  return (
    <Modal
      isOpen
      onClose={onClose}
      title={t('organizeBookmarks.title')}
      widthClass="max-w-lg"
      closeOnBackdrop={!isLoading}
      closeOnEscape={!isLoading}
      showCloseButton={!isLoading}
    >
      <p className="nb-text-secondary mb-6">
        {t('organizeBookmarks.selectAction')}
      </p>
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => {
            onConfirm('export');
          }}
          disabled={isLoading}
          className="nb-btn nb-btn-secondary w-full justify-start text-left py-4 px-4 disabled:cursor-not-allowed"
        >
          <div className="font-medium">1. {t('organizeBookmarks.exportAndOrganize')}</div>
          <div className="text-sm nb-text-secondary mt-1">
            {t('organizeBookmarks.exportAndOrganizeDesc')}
          </div>
        </button>
        
        <button
          type="button"
          onClick={() => {
            onConfirm('organize');
          }}
          disabled={isLoading}
          className="nb-btn nb-btn-secondary w-full justify-start text-left py-4 px-4 disabled:cursor-not-allowed"
        >
          <div className="font-medium">2. {t('organizeBookmarks.organizeDirectly')}</div>
          <div className="text-sm nb-text-secondary mt-1">
            {t('organizeBookmarks.organizeDirectlyDesc')}
          </div>
        </button>
      </div>

      <div className="flex justify-end space-x-4 mt-8">
        <button
          type="button"
          onClick={() => {
            onClose();
          }}
          disabled={isLoading}
          className="nb-btn nb-btn-secondary px-5 py-2 disabled:cursor-not-allowed"
        >
          3. {t('organizeBookmarks.cancelOption')}
        </button>
      </div>
    </Modal>
  );
};
