import React from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from './Modal';
import { BulkRegenerationProgress } from '../types/tags';

interface BulkTagRegenerationModalProps {
  isOpen: boolean;
  progress: BulkRegenerationProgress;
  onCancel: () => void;
  onComplete: () => void;
}

export const BulkTagRegenerationModal: React.FC<BulkTagRegenerationModalProps> = ({
  isOpen,
  progress,
  onCancel,
  onComplete,
}) => {
  const { t } = useTranslation();
  const percentage = progress.total > 0 ? (progress.processed / progress.total) * 100 : 0;
  const isCompleted = progress.status === 'completed' || progress.status === 'cancelled';
  const isCancelled = progress.status === 'cancelled';

  const getStatusMessage = () => {
    if (isCancelled) {
      return t('bulkRegeneration.cancelled');
    }
    if (progress.status === 'completed') {
      return t('bulkRegeneration.completed');
    }
    if (progress.currentBookmark) {
      return t('bulkRegeneration.processingBookmark', { bookmark: progress.currentBookmark });
    }
    return t('bulkRegeneration.processingBookmarks');
  };

  return (
    <Modal isOpen={isOpen} onClose={isCompleted ? onComplete : () => {}} title={t('bulkRegeneration.title')} widthClass="max-w-md">
      <div className="space-y-6">
        {/* 总体进度 - Neo-Brutalism 风格 */}
        <div>
          <div className="flex justify-between text-sm nb-text-secondary mb-3 font-medium uppercase tracking-wide">
            <span>{t('bulkRegeneration.overallProgress')}</span>
            <span className="px-2 py-0.5 bg-[color:var(--nb-accent-blue)] border-2 border-[color:var(--nb-border)] text-xs font-bold nb-text">
              {Math.round(percentage)}%
            </span>
          </div>
          <div className="w-full border-3 border-[color:var(--nb-border)] h-6 bg-[color:var(--nb-card)] overflow-hidden shadow-[3px_3px_0px_0px_var(--nb-border)]">
            <div
              className="bg-[color:var(--nb-accent-blue)] h-full transition-all duration-150 relative"
              style={{ width: `${percentage}%` }}
            >
              <div 
                className="absolute inset-0 opacity-30"
                style={{
                  backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(0,0,0,0.1) 4px, rgba(0,0,0,0.1) 8px)'
                }}
              ></div>
            </div>
          </div>
        </div>

        {/* 处理统计 - Neo-Brutalism 风格 */}
        <div>
          <div className="flex justify-between text-sm nb-text-secondary mb-3 font-medium uppercase tracking-wide">
            <span>{t('bulkRegeneration.processingProgress')}</span>
            <span className="font-bold nb-text">
              {progress.processed} / {progress.total}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="bg-[color:var(--nb-accent-green)] border-3 border-[color:var(--nb-border)] p-4 shadow-[4px_4px_0px_0px_var(--nb-border)]">
              <div className="font-bold nb-text uppercase tracking-wide">{t('bulkRegeneration.success')}</div>
              <div className="text-3xl font-black nb-text mt-1">{progress.successful}</div>
            </div>
            <div className="bg-[color:var(--nb-accent-pink)] border-3 border-[color:var(--nb-border)] p-4 shadow-[4px_4px_0px_0px_var(--nb-border)]">
              <div className="font-bold nb-text uppercase tracking-wide">{t('bulkRegeneration.failed')}</div>
              <div className="text-3xl font-black nb-text mt-1">{progress.failed}</div>
            </div>
          </div>
        </div>

        {/* 当前状态 - Neo-Brutalism 风格 */}
        <div>
          <div className="text-sm nb-text-secondary mb-2 font-medium uppercase tracking-wide">{t('bulkRegeneration.currentStatus')}</div>
          <div className="text-sm nb-bg-card nb-text p-4 border-3 border-[color:var(--nb-border)] shadow-[3px_3px_0px_0px_var(--nb-border)] break-words font-medium">
            {getStatusMessage()}
          </div>
        </div>

        {/* 加载动画或完成状态 - Neo-Brutalism 风格 */}
        {!isCompleted && (
          <div className="flex items-center justify-center gap-3 py-2">
            <div className="relative w-8 h-8">
              <div className="absolute inset-0 border-3 border-[color:var(--nb-border)]/20"></div>
              <div className="absolute inset-0 border-3 border-[color:var(--nb-accent-yellow)] border-t-transparent animate-spin"></div>
            </div>
            <span className="text-sm font-bold nb-text-secondary uppercase tracking-wide">{t('bulkRegeneration.processing')}</span>
          </div>
        )}

        {/* 完成后的总结 - Neo-Brutalism 风格 */}
        {isCompleted && (
          <div className="bg-[color:var(--nb-accent-yellow)] border-3 border-[color:var(--nb-border)] p-5 shadow-[4px_4px_0px_0px_var(--nb-border)] text-sm">
            {isCancelled ? (
              <div>
                <div className="font-black nb-text mb-2 uppercase tracking-tight text-base">{t('bulkRegeneration.cancelled')}</div>
                <div className="font-medium nb-text">{t('bulkRegeneration.cancelledSummary', { processed: progress.processed, successful: progress.successful, failed: progress.failed })}</div>
              </div>
            ) : (
              <div>
                <div className="font-black nb-text mb-2 uppercase tracking-tight text-base">{t('bulkRegeneration.completed')}</div>
                <div className="font-medium nb-text">
                  {t('bulkRegeneration.completedSummary', { total: progress.total, successful: progress.successful, failed: progress.failed })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 按钮 - Neo-Brutalism 风格 */}
        <div className="flex justify-end gap-4 pt-2">
          {!isCompleted && (
            <button
              onClick={onCancel}
              className="nb-btn nb-btn-secondary px-6 py-2.5"
            >
              {t('bulkRegeneration.cancel')}
            </button>
          )}
          {isCompleted && (
            <button
              onClick={onComplete}
              className="nb-btn nb-btn-primary px-6 py-2.5"
            >
              {t('bulkRegeneration.done')}
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
};
