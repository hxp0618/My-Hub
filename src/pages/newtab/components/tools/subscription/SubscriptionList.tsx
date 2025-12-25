/**
 * 订阅列表组件（表格样式）
 * 展示订阅表格，支持状态切换、续订、删除等操作
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Subscription,
  SUBSCRIPTION_TYPE_ICONS,
  SUBSCRIPTION_TYPE_COLORS,
  NotificationChannel,
} from '../../../../../types/subscription';
import {
  getRemainingDays,
  calculateStatus,
  isExpiringSoon,
} from '../../../../../services/SubscriptionService';

interface SubscriptionListProps {
  subscriptions: Subscription[];
  onEdit: (subscription: Subscription) => void;
  onDelete: (subscription: Subscription) => void;
  onToggleEnabled: (subscription: Subscription) => void;
  onRenew: (subscription: Subscription) => void;
}

const CHANNEL_ICONS: Record<NotificationChannel, string> = {
  telegram: 'send',
  email: 'mail',
  webhook: 'webhook',
  bark: 'notifications',
};

export const SubscriptionList: React.FC<SubscriptionListProps> = ({
  subscriptions,
  onEdit,
  onDelete,
  onToggleEnabled,
  onRenew,
}) => {
  const { t } = useTranslation();
  const now = Date.now();

  if (subscriptions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <span className="material-symbols-outlined text-6xl nb-text-secondary mb-4">
          event_busy
        </span>
        <p className="nb-text-secondary text-lg mb-2">
          {t('subscriptions.empty')}
        </p>
        <p className="nb-text-secondary text-sm">
          {t('subscriptions.emptyHint')}
        </p>
      </div>
    );
  }

  return (
    <div className="nb-card overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="bg-[var(--nb-bg)] border-b-2 border-[var(--nb-border)]">
            <th className="px-4 py-3 text-left text-sm font-semibold nb-text">
              {t('subscriptions.table.name')}
            </th>
            <th className="px-4 py-3 text-left text-sm font-semibold nb-text">
              {t('subscriptions.table.type')}
            </th>
            <th className="px-4 py-3 text-left text-sm font-semibold nb-text">
              {t('subscriptions.table.cycle')}
            </th>
            <th className="px-4 py-3 text-left text-sm font-semibold nb-text">
              {t('subscriptions.table.expiryDate')}
            </th>
            <th className="px-4 py-3 text-center text-sm font-semibold nb-text">
              {t('subscriptions.table.reminderDays')}
            </th>
            <th className="px-4 py-3 text-left text-sm font-semibold nb-text">
              {t('subscriptions.table.notificationChannels')}
            </th>
            <th className="px-4 py-3 text-center text-sm font-semibold nb-text">
              {t('subscriptions.table.status')}
            </th>
            <th className="px-4 py-3 text-center text-sm font-semibold nb-text">
              {t('subscriptions.table.actions')}
            </th>
          </tr>
        </thead>
        <tbody>
          {subscriptions.map((subscription, index) => {
            const status = calculateStatus(subscription, now);
            const remainingDays = getRemainingDays(subscription.expiryDate, now);
            const expiringSoon = isExpiringSoon(subscription, now);
            
            // 格式化到期日期
            const expiryDateStr = new Date(subscription.expiryDate).toLocaleDateString('zh-CN', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
            });
            
            // 状态样式
            const getStatusBadge = () => {
              if (status === 'expired') {
                return 'bg-[var(--nb-accent-pink)]';
              }
              if (status === 'disabled') {
                return 'bg-gray-300 dark:bg-gray-600';
              }
              if (expiringSoon) {
                return 'bg-[var(--nb-accent-yellow)]';
              }
              return 'bg-[var(--nb-accent-green)]';
            };
            
            // 剩余天数显示
            const getRemainingText = () => {
              if (remainingDays < 0) {
                return <span className="text-red-500">-{Math.abs(remainingDays)}天</span>;
              }
              if (remainingDays === 0) {
                return <span className="text-yellow-600">今天</span>;
              }
              if (expiringSoon) {
                return <span className="text-yellow-600">{remainingDays}天</span>;
              }
              return <span className="text-green-600">{remainingDays}天</span>;
            };

            return (
              <tr
                key={subscription.id}
                className={`border-b border-[var(--nb-border)] last:border-b-0 hover:bg-[var(--nb-accent-yellow)]/30 transition-colors ${
                  status === 'disabled' ? 'opacity-60' : ''
                }`}
              >
                {/* 名称 */}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-8 h-8 rounded-lg border-2 border-[var(--nb-border)] flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: SUBSCRIPTION_TYPE_COLORS[subscription.type] }}
                    >
                      <span className="material-symbols-outlined text-sm text-[var(--nb-border)]">
                        {SUBSCRIPTION_TYPE_ICONS[subscription.type]}
                      </span>
                    </div>
                    <span className="font-medium nb-text truncate max-w-[150px]" title={subscription.name}>
                      {subscription.name}
                    </span>
                  </div>
                </td>
                
                {/* 类型 */}
                <td className="px-4 py-3">
                  <span className="text-sm nb-text-secondary">
                    {t(`tools.subscriptionManager.types.${subscription.type}`)}
                  </span>
                </td>
                
                {/* 周期 */}
                <td className="px-4 py-3">
                  <span className="text-sm nb-text-secondary">
                    {t(`tools.subscriptionManager.cycles.${subscription.cycle}`)}
                  </span>
                </td>
                
                {/* 到期时间 */}
                <td className="px-4 py-3">
                  <div className="text-sm">
                    <div className="nb-text">{expiryDateStr}</div>
                    <div className="text-xs">{getRemainingText()}</div>
                  </div>
                </td>
                
                {/* 提前通知天数 */}
                <td className="px-4 py-3 text-center">
                  <span className="text-sm nb-text">{subscription.reminderDays}</span>
                </td>
                
                {/* 通知类型 */}
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    {(subscription.notificationChannels || []).length > 0 ? (
                      subscription.notificationChannels.map((channel) => (
                        <span
                          key={channel}
                          className="w-6 h-6 rounded border border-[var(--nb-border)] flex items-center justify-center bg-[var(--nb-card)]"
                          title={t(`subscriptions.channels.${channel}`)}
                        >
                          <span className="material-symbols-outlined text-xs">
                            {CHANNEL_ICONS[channel]}
                          </span>
                        </span>
                      ))
                    ) : (
                      <span className="text-xs nb-text-secondary">-</span>
                    )}
                  </div>
                </td>
                
                {/* 状态 */}
                <td className="px-4 py-3 text-center">
                  <button
                    onClick={() => onToggleEnabled(subscription)}
                    className={`relative w-10 h-5 rounded-full border-2 border-[var(--nb-border)] transition-colors ${
                      subscription.isEnabled ? 'bg-[var(--nb-accent-green)]' : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                    title={subscription.isEnabled ? t('subscriptions.enabled') : t('subscriptions.disabled')}
                  >
                    <span
                      className={`absolute top-0 w-3.5 h-3.5 rounded-full bg-[var(--nb-border)] transition-transform ${
                        subscription.isEnabled ? 'left-5' : 'left-0.5'
                      }`}
                    />
                  </button>
                </td>
                
                {/* 操作 */}
                <td className="px-4 py-3">
                  <div className="flex items-center justify-center gap-1">
                    {/* 续订按钮 */}
                    {subscription.cycle !== 'one-time' && (
                      <button
                        onClick={() => onRenew(subscription)}
                        className="p-1.5 rounded hover:bg-[var(--nb-bg)] transition-colors"
                        title={t('subscriptions.renew')}
                      >
                        <span className="material-symbols-outlined text-lg nb-text">refresh</span>
                      </button>
                    )}
                    
                    {/* 编辑按钮 */}
                    <button
                      onClick={() => onEdit(subscription)}
                      className="p-1.5 rounded hover:bg-[var(--nb-bg)] transition-colors"
                      title={t('subscriptions.edit')}
                    >
                      <span className="material-symbols-outlined text-lg nb-text">edit</span>
                    </button>
                    
                    {/* 删除按钮 */}
                    <button
                      onClick={() => onDelete(subscription)}
                      className="p-1.5 rounded hover:bg-[var(--nb-accent-pink)]/20 transition-colors"
                      title={t('subscriptions.delete')}
                    >
                      <span className="material-symbols-outlined text-lg text-red-500">delete</span>
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default SubscriptionList;
