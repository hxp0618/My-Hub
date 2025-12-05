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
        {/* 总体进度 */}
        <div>
          <div className="flex justify-between text-sm text-secondary mb-2">
            <span>{t('bulkRegeneration.overallProgress')}</span>
            <span>{Math.round(percentage)}%</span>
          </div>
          <div className="w-full bg-secondary rounded-full h-2">
            <div
              className="bg-accent h-2 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>

        {/* 处理统计 */}
        <div>
          <div className="flex justify-between text-sm text-secondary mb-2">
            <span>{t('bulkRegeneration.processingProgress')}</span>
            <span>
              {progress.processed} / {progress.total}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="bg-success-light text-success p-2 rounded">
              <div className="font-semibold">{t('bulkRegeneration.success')}</div>
              <div className="text-lg">{progress.successful}</div>
            </div>
            <div className="bg-error-light text-error p-2 rounded">
              <div className="font-semibold">{t('bulkRegeneration.failed')}</div>
              <div className="text-lg">{progress.failed}</div>
            </div>
          </div>
        </div>

        {/* 当前状态 */}
        <div>
          <div className="text-sm text-secondary mb-2">{t('bulkRegeneration.currentStatus')}</div>
          <div className="text-sm bg-secondary text-main p-3 rounded-lg break-words">{getStatusMessage()}</div>
        </div>

        {/* 加载动画或完成状态 */}
        {!isCompleted && (
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-accent"></div>
            <span className="ml-2 text-sm text-secondary">{t('bulkRegeneration.processing')}</span>
          </div>
        )}

        {/* 完成后的总结 */}
        {isCompleted && (
          <div className="bg-accent-light text-accent p-3 rounded-lg text-sm">
            {isCancelled ? (
              <div>
                <div className="font-semibold mb-1">{t('bulkRegeneration.cancelled')}</div>
                <div>{t('bulkRegeneration.cancelledSummary', { processed: progress.processed, successful: progress.successful, failed: progress.failed })}</div>
              </div>
            ) : (
              <div>
                <div className="font-semibold mb-1">{t('bulkRegeneration.completed')}</div>
                <div>
                  {t('bulkRegeneration.completedSummary', { total: progress.total, successful: progress.successful, failed: progress.failed })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 按钮 */}
        <div className="flex justify-end gap-3">
          {!isCompleted && (
            <button
              onClick={onCancel}
              className="px-5 py-2 rounded-full text-main bg-secondary hover:bg-tertiary transition"
            >
              {t('bulkRegeneration.cancel')}
            </button>
          )}
          {isCompleted && (
            <button
              onClick={onComplete}
              className="px-5 py-2 rounded-full text-white bg-accent hover:opacity-90 transition-theme"
            >
              {t('bulkRegeneration.done')}
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
};
