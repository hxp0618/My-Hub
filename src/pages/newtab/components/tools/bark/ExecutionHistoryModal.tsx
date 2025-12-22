/**
 * 执行历史模态框组件
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { TaskExecutionRecord } from '../../../../../types/scheduledTask';
import { Modal } from '../../../../../components/Modal';

interface ExecutionHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskTitle: string;
  records: TaskExecutionRecord[];
}

/**
 * 格式化时间戳为本地时间字符串
 */
function formatDateTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString();
}

/**
 * 执行历史模态框
 */
export const ExecutionHistoryModal: React.FC<ExecutionHistoryModalProps> = ({
  isOpen,
  onClose,
  taskTitle,
  records,
}) => {
  const { t } = useTranslation();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('tools.barkNotifier.scheduled.historyTitle', { title: taskTitle })}
      widthClass="max-w-2xl"
    >
      <div className="space-y-4 max-h-[60vh] overflow-y-auto">
        {records.length === 0 ? (
          <div className="text-center py-8">
            <span className="material-symbols-outlined text-4xl nb-text-secondary mb-2">
              history
            </span>
            <p className="nb-text-secondary">
              {t('tools.barkNotifier.scheduled.noHistory')}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {records.map((record) => (
              <div
                key={record.id}
                className="nb-card-static p-4 space-y-2"
              >
                {/* 执行时间和状态 */}
                <div className="flex items-center justify-between">
                  <span className="text-sm nb-text font-medium">
                    {formatDateTime(record.executedAt)}
                  </span>
                  <span
                    className={`px-2 py-0.5 text-xs font-medium rounded-full nb-border ${
                      record.status === 'success'
                        ? 'bg-[var(--nb-accent-green)]'
                        : 'bg-[var(--nb-accent-pink)]'
                    }`}
                  >
                    {record.status === 'success'
                      ? t('tools.barkNotifier.scheduled.status.success')
                      : t('tools.barkNotifier.scheduled.status.failed')}
                  </span>
                </div>

                {/* 发送统计 */}
                <div className="flex items-center gap-4 text-xs nb-text-secondary">
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm" style={{ color: 'var(--nb-accent-green)' }}>
                      check_circle
                    </span>
                    {t('tools.barkNotifier.scheduled.successCount', { count: record.successCount })}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm" style={{ color: 'var(--nb-accent-pink)' }}>
                      cancel
                    </span>
                    {t('tools.barkNotifier.scheduled.failedCount', { count: record.failedCount })}
                  </span>
                </div>

                {/* 错误信息 */}
                {record.errorMessage && (
                  <div className="text-xs p-2 rounded-lg bg-[var(--nb-accent-pink)] bg-opacity-20">
                    <span className="font-medium">{t('tools.barkNotifier.scheduled.errorMessage')}:</span>{' '}
                    {record.errorMessage}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 底部按钮 */}
      <div className="flex justify-end mt-6 pt-4 border-t-2 border-[var(--nb-border)]">
        <button
          onClick={onClose}
          className="nb-btn nb-btn-secondary px-6 py-2"
        >
          {t('common.close')}
        </button>
      </div>
    </Modal>
  );
};
