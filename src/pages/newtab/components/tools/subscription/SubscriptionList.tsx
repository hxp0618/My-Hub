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
  emptyTitle?: string;
  emptyHint?: string;
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
  emptyTitle,
  emptyHint,
  onEdit,
  onDelete,
  onToggleEnabled,
  onRenew,
}) => {
  const { t, i18n } = useTranslation();
  const now = Date.now();
  const dateLocale = i18n.language === 'zh-CN' ? 'zh-CN' : 'en-US';

  if (subscriptions.length === 0) {
    return (
      <div className="subscription-empty-state nb-card-static">
        <span className="material-symbols-outlined subscription-empty-icon" aria-hidden="true">
          event_busy
        </span>
        <p className="subscription-empty-title nb-text">
          {emptyTitle ?? t('subscriptions.empty')}
        </p>
        <p className="subscription-empty-hint nb-text-secondary">
          {emptyHint ?? t('subscriptions.emptyHint')}
        </p>
      </div>
    );
  }

  return (
    <div className="subscription-list-card nb-card-static">
      <div className="subscription-list-scroll">
        <table className="subscription-list-table">
          <thead>
            <tr className="subscription-list-header-row">
              <th className="subscription-list-header-cell">
                {t('subscriptions.table.name')}
              </th>
              <th className="subscription-list-header-cell">
                {t('subscriptions.table.type')}
              </th>
              <th className="subscription-list-header-cell">
                {t('subscriptions.table.cycle')}
              </th>
              <th className="subscription-list-header-cell">
                {t('subscriptions.table.expiryDate')}
              </th>
              <th className="subscription-list-header-cell subscription-list-cell--center">
                {t('subscriptions.table.reminderDays')}
              </th>
              <th className="subscription-list-header-cell">
                {t('subscriptions.table.notificationChannels')}
              </th>
              <th className="subscription-list-header-cell subscription-list-cell--center">
                {t('subscriptions.table.status')}
              </th>
              <th className="subscription-list-header-cell subscription-list-cell--center">
                {t('subscriptions.table.actions')}
              </th>
            </tr>
          </thead>
          <tbody>
            {subscriptions.map((subscription) => {
              const status = calculateStatus(subscription, now);
              const remainingDays = getRemainingDays(subscription.expiryDate, now);
              const expiringSoon = isExpiringSoon(subscription, now);

              const expiryDateStr = new Date(subscription.expiryDate).toLocaleDateString(dateLocale, {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
              });

              const getRemainingText = () => {
                if (remainingDays < 0) {
                  return (
                    <span className="subscription-remaining subscription-remaining--danger">
                      {t('subscriptions.remaining.expired', { days: Math.abs(remainingDays) })}
                    </span>
                  );
                }
                if (remainingDays === 0) {
                  return (
                    <span className="subscription-remaining subscription-remaining--warning">
                      {t('subscriptions.remaining.today')}
                    </span>
                  );
                }
                if (expiringSoon) {
                  return (
                    <span className="subscription-remaining subscription-remaining--warning">
                      {t('subscriptions.remaining.days', { days: remainingDays })}
                    </span>
                  );
                }
                return (
                  <span className="subscription-remaining subscription-remaining--success">
                    {t('subscriptions.remaining.days', { days: remainingDays })}
                  </span>
                );
              };

              return (
                <tr
                  key={subscription.id}
                  className={`subscription-list-row ${
                    status === 'disabled' ? 'subscription-list-row--disabled' : ''
                  }`}
                >
                  {/* 名称 */}
                  <td className="subscription-list-cell">
                    <div className="subscription-list-name">
                      <div
                        className="subscription-list-type-icon"
                        style={{ backgroundColor: SUBSCRIPTION_TYPE_COLORS[subscription.type] }}
                      >
                        <span className="material-symbols-outlined text-sm" aria-hidden="true">
                          {SUBSCRIPTION_TYPE_ICONS[subscription.type]}
                        </span>
                      </div>
                      <span className="subscription-list-title nb-text" title={subscription.name}>
                        {subscription.name}
                      </span>
                    </div>
                  </td>

                  {/* 类型 */}
                  <td className="subscription-list-cell">
                    <span className="subscription-list-meta nb-text-secondary">
                      {t(`tools.subscriptionManager.types.${subscription.type}`)}
                    </span>
                  </td>

                  {/* 周期 */}
                  <td className="subscription-list-cell">
                    <span className="subscription-list-meta nb-text-secondary">
                      {t(`tools.subscriptionManager.cycles.${subscription.cycle}`)}
                    </span>
                  </td>

                  {/* 到期时间 */}
                  <td className="subscription-list-cell">
                    <div className="subscription-list-date">
                      <div className="nb-text">{expiryDateStr}</div>
                      <div>{getRemainingText()}</div>
                    </div>
                  </td>

                  {/* 提前通知天数 */}
                  <td className="subscription-list-cell subscription-list-cell--center">
                    <span className="subscription-list-meta nb-text">{subscription.reminderDays}</span>
                  </td>

                  {/* 通知类型 */}
                  <td className="subscription-list-cell">
                    <div className="subscription-channel-list">
                      {(subscription.notificationChannels || []).length > 0 ? (
                        subscription.notificationChannels.map((channel) => (
                          <span
                            key={channel}
                            className="subscription-channel-badge"
                            title={t(`subscriptions.channels.${channel}`)}
                            aria-label={t(`subscriptions.channels.${channel}`)}
                          >
                            <span className="material-symbols-outlined text-xs" aria-hidden="true">
                              {CHANNEL_ICONS[channel]}
                            </span>
                          </span>
                        ))
                      ) : (
                        <span className="subscription-channel-empty nb-text-secondary">-</span>
                      )}
                    </div>
                  </td>

                  {/* 状态 */}
                  <td className="subscription-list-cell subscription-list-cell--center">
                    <button
                      type="button"
                      onClick={() => onToggleEnabled(subscription)}
                      className="nb-toggle subscription-toggle"
                      title={subscription.isEnabled ? t('subscriptions.enabled') : t('subscriptions.disabled')}
                      aria-label={t(
                        subscription.isEnabled
                          ? 'subscriptions.actionLabels.disable'
                          : 'subscriptions.actionLabels.enable',
                        { name: subscription.name }
                      )}
                      aria-pressed={subscription.isEnabled}
                    >
                      <span className={`nb-toggle-track ${subscription.isEnabled ? 'active' : ''}`}>
                        <span className="nb-toggle-thumb" />
                      </span>
                    </button>
                  </td>

                  {/* 操作 */}
                  <td className="subscription-list-cell">
                    <div className="subscription-action-group">
                      {/* 续订按钮 */}
                      {subscription.cycle !== 'one-time' && (
                        <button
                          type="button"
                          onClick={() => onRenew(subscription)}
                          className="subscription-action-button"
                          title={t('subscriptions.renew')}
                          aria-label={t('subscriptions.actionLabels.renew', { name: subscription.name })}
                        >
                          <span className="material-symbols-outlined text-lg nb-text" aria-hidden="true">refresh</span>
                        </button>
                      )}

                      {/* 编辑按钮 */}
                      <button
                        type="button"
                        onClick={() => onEdit(subscription)}
                        className="subscription-action-button"
                        title={t('subscriptions.edit')}
                        aria-label={t('subscriptions.actionLabels.edit', { name: subscription.name })}
                      >
                        <span className="material-symbols-outlined text-lg nb-text" aria-hidden="true">edit</span>
                      </button>

                      {/* 删除按钮 */}
                      <button
                        type="button"
                        onClick={() => onDelete(subscription)}
                        className="subscription-action-button subscription-action-button--danger"
                        title={t('subscriptions.delete')}
                        aria-label={t('subscriptions.actionLabels.delete', { name: subscription.name })}
                      >
                        <span className="material-symbols-outlined text-lg" aria-hidden="true">delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SubscriptionList;
