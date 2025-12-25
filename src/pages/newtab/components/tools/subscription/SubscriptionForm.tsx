/**
 * 订阅表单组件
 * 用于创建和编辑订阅
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Subscription,
  SubscriptionType,
  SubscriptionCycle,
  NotificationChannel,
  CreateSubscriptionParams,
  SUBSCRIPTION_TYPE_ICONS,
} from '../../../../../types/subscription';

interface SubscriptionFormProps {
  subscription?: Subscription;
  defaultReminderDays: number;
  onSubmit: (data: CreateSubscriptionParams) => void;
  onCancel: () => void;
}

const SUBSCRIPTION_TYPES: SubscriptionType[] = [
  'video', 'music', 'cloud', 'software', 'domain', 'server', 'other'
];

const SUBSCRIPTION_CYCLES: SubscriptionCycle[] = [
  'monthly', 'quarterly', 'semi-annual', 'annual', 'one-time'
];

const NOTIFICATION_CHANNELS: { id: NotificationChannel; icon: string }[] = [
  { id: 'telegram', icon: 'send' },
  { id: 'email', icon: 'mail' },
  { id: 'webhook', icon: 'webhook' },
  { id: 'bark', icon: 'notifications' },
];

export const SubscriptionForm: React.FC<SubscriptionFormProps> = ({
  subscription,
  defaultReminderDays,
  onSubmit,
  onCancel,
}) => {
  const { t } = useTranslation();
  const isEditing = !!subscription;

  // 表单状态
  const [name, setName] = useState(subscription?.name || '');
  const [type, setType] = useState<SubscriptionType>(subscription?.type || 'software');
  const [customType, setCustomType] = useState(subscription?.customType || '');
  const [cycle, setCycle] = useState<SubscriptionCycle>(subscription?.cycle || 'annual');
  const [expiryDate, setExpiryDate] = useState(() => {
    if (subscription?.expiryDate) {
      return new Date(subscription.expiryDate).toISOString().split('T')[0];
    }
    // 默认一年后
    const date = new Date();
    date.setFullYear(date.getFullYear() + 1);
    return date.toISOString().split('T')[0];
  });
  const [reminderDays, setReminderDays] = useState(subscription?.reminderDays ?? defaultReminderDays);
  const [notificationChannels, setNotificationChannels] = useState<NotificationChannel[]>(
    subscription?.notificationChannels || []
  );
  const [url, setUrl] = useState(subscription?.url || '');
  const [notes, setNotes] = useState(subscription?.notes || '');
  const [isEnabled, setIsEnabled] = useState(subscription?.isEnabled ?? true);

  // 表单验证
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = useCallback(() => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = t('tools.subscriptionManager.subscription.nameRequired');
    }

    if (type === 'other' && !customType.trim()) {
      newErrors.customType = t('tools.subscriptionManager.subscription.nameRequired');
    }

    if (!expiryDate) {
      newErrors.expiryDate = t('tools.subscriptionManager.subscription.nameRequired');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [name, type, customType, expiryDate, t]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    const data: CreateSubscriptionParams = {
      name: name.trim(),
      type,
      customType: type === 'other' ? customType.trim() : undefined,
      cycle,
      expiryDate: new Date(expiryDate).getTime(),
      reminderDays,
      notificationChannels,
      isEnabled,
      url: url.trim() || undefined,
      notes: notes.trim() || undefined,
    };

    onSubmit(data);
  }, [name, type, customType, cycle, expiryDate, reminderDays, notificationChannels, isEnabled, notes, validate, onSubmit]);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* 订阅名称 */}
      <div>
        <label className="block text-sm font-medium nb-text mb-1">
          {t('tools.subscriptionManager.subscription.name')}
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('tools.subscriptionManager.subscription.namePlaceholder')}
          className={`nb-input w-full ${errors.name ? 'border-red-500' : ''}`}
        />
        {errors.name && (
          <p className="text-red-500 text-xs mt-1">{errors.name}</p>
        )}
      </div>

      {/* 订阅类型 */}
      <div>
        <label className="block text-sm font-medium nb-text mb-1">
          {t('tools.subscriptionManager.subscription.type')}
        </label>
        <div className="grid grid-cols-4 gap-2">
          {SUBSCRIPTION_TYPES.map((t_type) => (
            <button
              key={t_type}
              type="button"
              onClick={() => setType(t_type)}
              className={`p-2 rounded-lg border-2 flex flex-col items-center gap-1 transition-all ${
                type === t_type
                  ? 'border-[var(--nb-border)] bg-[var(--nb-accent-yellow)] shadow-[2px_2px_0px_0px_var(--nb-border)]'
                  : 'border-[var(--nb-border)] bg-[var(--nb-card)] hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <span className="material-symbols-outlined text-lg">
                {SUBSCRIPTION_TYPE_ICONS[t_type]}
              </span>
              <span className="text-xs nb-text">
                {t(`tools.subscriptionManager.types.${t_type}`)}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* 自定义类型（当选择"其他"时显示） */}
      {type === 'other' && (
        <div>
          <label className="block text-sm font-medium nb-text mb-1">
            {t('tools.subscriptionManager.subscription.customType')}
          </label>
          <input
            type="text"
            value={customType}
            onChange={(e) => setCustomType(e.target.value)}
            placeholder={t('tools.subscriptionManager.subscription.customTypePlaceholder')}
            className={`nb-input w-full ${errors.customType ? 'border-red-500' : ''}`}
          />
          {errors.customType && (
            <p className="text-red-500 text-xs mt-1">{errors.customType}</p>
          )}
        </div>
      )}

      {/* 订阅周期 */}
      <div>
        <label className="block text-sm font-medium nb-text mb-1">
          {t('tools.subscriptionManager.subscription.cycle')}
        </label>
        <select
          value={cycle}
          onChange={(e) => setCycle(e.target.value as SubscriptionCycle)}
          className="nb-input w-full"
        >
          {SUBSCRIPTION_CYCLES.map((c) => (
            <option key={c} value={c}>
              {t(`tools.subscriptionManager.cycles.${c}`)}
            </option>
          ))}
        </select>
      </div>

      {/* 到期日期 */}
      <div>
        <label className="block text-sm font-medium nb-text mb-1">
          {t('tools.subscriptionManager.subscription.expiryDate')}
        </label>
        <input
          type="date"
          value={expiryDate}
          onChange={(e) => setExpiryDate(e.target.value)}
          className={`nb-input w-full ${errors.expiryDate ? 'border-red-500' : ''}`}
        />
        {errors.expiryDate && (
          <p className="text-red-500 text-xs mt-1">{errors.expiryDate}</p>
        )}
      </div>

      {/* 提前提醒天数 */}
      <div>
        <label className="block text-sm font-medium nb-text mb-1">
          {t('tools.subscriptionManager.subscription.reminderDays')}
        </label>
        <input
          type="number"
          min="0"
          max="365"
          value={reminderDays}
          onChange={(e) => setReminderDays(parseInt(e.target.value) || 0)}
          className="nb-input w-full"
        />
      </div>

      {/* 通知渠道（多选） */}
      <div>
        <label className="block text-sm font-medium nb-text mb-2">
          {t('subscriptions.notificationChannels')}
        </label>
        <div className="flex flex-wrap gap-2">
          {NOTIFICATION_CHANNELS.map((channel) => {
            const isSelected = notificationChannels.includes(channel.id);
            return (
              <button
                key={channel.id}
                type="button"
                onClick={() => {
                  if (isSelected) {
                    setNotificationChannels(notificationChannels.filter(c => c !== channel.id));
                  } else {
                    setNotificationChannels([...notificationChannels, channel.id]);
                  }
                }}
                className={`px-3 py-1.5 rounded-lg border-2 flex items-center gap-1.5 transition-all text-sm ${
                  isSelected
                    ? 'border-[var(--nb-border)] bg-[var(--nb-accent-blue)] shadow-[2px_2px_0px_0px_var(--nb-border)]'
                    : 'border-[var(--nb-border)] bg-[var(--nb-card)] hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <span className="material-symbols-outlined text-base">{channel.icon}</span>
                <span>{t(`subscriptions.channels.${channel.id}`)}</span>
              </button>
            );
          })}
        </div>
        <p className="text-xs nb-text-secondary mt-1">
          {t('subscriptions.notificationChannelsHint')}
        </p>
      </div>

      {/* 订阅地址 */}
      <div>
        <label className="block text-sm font-medium nb-text mb-1">
          {t('subscriptions.url')}
        </label>
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder={t('subscriptions.urlPlaceholder')}
          className="nb-input w-full"
        />
      </div>

      {/* 启用状态 */}
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium nb-text">
          {t('tools.subscriptionManager.subscription.status')}
        </label>
        <button
          type="button"
          onClick={() => setIsEnabled(!isEnabled)}
          className={`relative w-12 h-6 rounded-full border-2 border-[var(--nb-border)] transition-colors ${
            isEnabled ? 'bg-[var(--nb-accent-green)]' : 'bg-gray-300 dark:bg-gray-600'
          }`}
        >
          <span
            className={`absolute top-0.5 w-4 h-4 rounded-full bg-[var(--nb-border)] transition-transform ${
              isEnabled ? 'left-6' : 'left-0.5'
            }`}
          />
        </button>
      </div>

      {/* 备注 */}
      <div>
        <label className="block text-sm font-medium nb-text mb-1">
          {t('tools.subscriptionManager.subscription.notes')}
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={t('tools.subscriptionManager.subscription.notesPlaceholder')}
          rows={2}
          className="nb-input w-full resize-none"
        />
      </div>

      {/* 按钮 */}
      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          className="nb-btn nb-btn-primary flex-1"
        >
          {isEditing ? t('tools.subscriptionManager.subscription.edit') : t('tools.subscriptionManager.subscription.add')}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="nb-btn nb-btn-ghost flex-1"
        >
          {t('common.cancel')}
        </button>
      </div>
    </form>
  );
};

export default SubscriptionForm;
