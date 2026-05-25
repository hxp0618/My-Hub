import React from 'react';
import { useTranslation } from 'react-i18next';

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
    <div className="fixed inset-0 modal-overlay flex items-center justify-center z-50 transition-colors">
      <div className="nb-card-static w-full max-w-lg p-8">
        <h3 className="text-lg font-bold mb-4 nb-text">{t('organizeBookmarks.title')}</h3>
        <p className="nb-text-secondary mb-6">
          {t('organizeBookmarks.selectAction')}
        </p>
        <div className="space-y-4">
          <button
            onClick={() => {
              onConfirm('export');
            }}
            disabled={isLoading}
            className="nb-btn nb-btn-secondary w-full justify-start text-left py-4 px-4 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="font-medium">1. {t('organizeBookmarks.exportAndOrganize')}</div>
            <div className="text-sm nb-text-secondary mt-1">
              {t('organizeBookmarks.exportAndOrganizeDesc')}
            </div>
          </button>
          
          <button
            onClick={() => {
            onConfirm('organize');
            }}
            disabled={isLoading}
            className="nb-btn nb-btn-secondary w-full justify-start text-left py-4 px-4 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="font-medium">2. {t('organizeBookmarks.organizeDirectly')}</div>
            <div className="text-sm nb-text-secondary mt-1">
              {t('organizeBookmarks.organizeDirectlyDesc')}
            </div>
          </button>
        </div>
        
        <div className="flex justify-end space-x-4 mt-8">
          <button 
            onClick={() => {
              onClose();
            }} 
            disabled={isLoading}
            className="nb-btn nb-btn-secondary px-5 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            3. {t('organizeBookmarks.cancelOption')}
          </button>
        </div>
      </div>
    </div>
  );
};
