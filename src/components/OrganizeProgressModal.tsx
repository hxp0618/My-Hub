import React from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from './Modal';

interface OrganizeProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  progress: number;
  currentBatch: number;
  totalBatches: number;
  processedCount: number;
  totalCount: number;
  currentStatus: string;
  canClose?: boolean;
}

export const OrganizeProgressModal: React.FC<OrganizeProgressModalProps> = ({
  isOpen,
  onClose,
  progress,
  currentBatch,
  totalBatches,
  processedCount,
  totalCount,
  currentStatus,
  canClose = false
}) => {
  const { t } = useTranslation();
  console.log('[OrganizeProgressModal] 渲染进度对话框', {
    progress,
    currentBatch,
    totalBatches,
    processedCount,
    totalCount,
    currentStatus
  });

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={t('organizeProgress.title')}
      widthClass="max-w-md"
    >
      <div className="space-y-6">
        {/* 总体进度 */}
        <div>
          <div className="flex justify-between text-sm text-secondary mb-2">
            <span>{t('organizeProgress.overallProgress')}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-secondary rounded-full h-2">
            <div 
              className="bg-black dark:bg-white h-2 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* 批次进度 */}
        <div>
          <div className="flex justify-between text-sm text-secondary mb-2">
            <span>{t('organizeProgress.currentBatch')}</span>
            <span>{currentBatch} / {totalBatches}</span>
          </div>
          <div className="text-xs text-secondary">
            {t('organizeProgress.processedCount', { processed: processedCount, total: totalCount })}
          </div>
        </div>

        {/* 当前状态 */}
        <div>
          <div className="text-sm text-secondary mb-2">{t('organizeProgress.currentStatus')}</div>
          <div className="text-sm bg-secondary text-main p-3 rounded-lg">
            {currentStatus}
          </div>
        </div>

        {/* 加载动画 */}
        {!canClose && (
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-accent"></div>
            <span className="ml-2 text-sm text-secondary">{t('organizeProgress.processing')}</span>
          </div>
        )}

        {/* 完成后的关闭按钮 */}
        {canClose && (
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-5 py-2 rounded-full text-white bg-accent hover:opacity-90 transition-theme"
            >
              {t('organizeProgress.done')}
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
};
