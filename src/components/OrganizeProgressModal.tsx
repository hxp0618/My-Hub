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

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={t('organizeProgress.title')}
      widthClass="max-w-md"
    >
      <div className="space-y-6">
        {/* 总体进度 - Neo-Brutalism 风格 */}
        <div>
          <div className="flex justify-between text-sm nb-text-secondary mb-2">
            <span className="font-bold uppercase tracking-wide">{t('organizeProgress.overallProgress')}</span>
            <span className="font-mono font-bold">{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-[color:var(--nb-bg)] border-3 border-[color:var(--nb-border)] h-4 relative overflow-hidden">
            <div
              className="bg-[color:var(--nb-accent-yellow)] h-full transition-all duration-300 ease-out absolute left-0 top-0 border-r-2 border-[color:var(--nb-border)]"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* 批次进度 */}
        <div>
          <div className="flex justify-between text-sm nb-text-secondary mb-2">
            <span className="font-bold uppercase tracking-wide">{t('organizeProgress.currentBatch')}</span>
            <span className="font-mono font-bold">{currentBatch} / {totalBatches}</span>
          </div>
          <div className="text-xs nb-text-secondary">
            {t('organizeProgress.processedCount', { processed: processedCount, total: totalCount })}
          </div>
        </div>

        {/* 当前状态 */}
        <div>
          <div className="text-sm nb-text-secondary mb-2 font-bold uppercase tracking-wide">{t('organizeProgress.currentStatus')}</div>
          <div className="text-sm nb-bg-card nb-text p-3 border-3 border-[color:var(--nb-border)] shadow-[3px_3px_0px_0px_var(--nb-border)]">
            {currentStatus}
          </div>
        </div>

        {/* 加载动画 - Neo-Brutalism 风格 */}
        {!canClose && (
          <div className="flex items-center justify-center gap-3">
            <div className="relative w-8 h-8">
              <div className="w-8 h-8 border-3 border-[color:var(--nb-border)]/20"></div>
              <div className="absolute top-0 left-0 w-8 h-8 border-3 border-[color:var(--nb-accent-yellow)] border-t-transparent animate-spin"></div>
            </div>
            <span className="text-sm nb-text-secondary font-medium">{t('organizeProgress.processing')}</span>
          </div>
        )}

        {/* 完成后的关闭按钮 */}
        {canClose && (
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="nb-btn nb-btn-success px-6 py-2"
            >
              {t('organizeProgress.done')}
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
};
