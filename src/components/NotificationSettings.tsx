/**
 * 通知设置组件（全局）
 * 配置各种通知渠道（Telegram、Email、Webhook、Bark）
 */
import React, { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  SubscriptionNotificationConfig,
  TelegramConfig,
  EmailConfig,
  WebhookConfig,
  SubscriptionBarkConfig,
  DEFAULT_NOTIFICATION_CONFIG,
} from '../types/subscription';
import { BarkKeyConfig } from '../types/bark';
import { notificationService, NotificationResult } from '../services/NotificationService';
import { BarkKeyManager } from '../services/BarkKeyManager';
import {
  getSubscriptionNotificationConfig,
  setSubscriptionNotificationConfig,
} from '../db/indexedDB';

interface ChannelCardProps {
  title: string;
  icon: string;
  enabled: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  onTest?: () => Promise<NotificationResult>;
}

const ChannelCard: React.FC<ChannelCardProps> = ({
  title,
  icon,
  enabled,
  onToggle,
  children,
  onTest,
}) => {
  const { t } = useTranslation();
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleTest = useCallback(async () => {
    if (!onTest) return;
    
    setTesting(true);
    setTestResult(null);
    
    try {
      const result = await onTest();
      setTestResult({
        success: result.success,
        message: result.success 
          ? t('settings.notification.testSuccess')
          : result.error || t('settings.notification.testFailed'),
      });
    } catch (error) {
      setTestResult({
        success: false,
        message: t('settings.notification.testFailed'),
      });
    } finally {
      setTesting(false);
    }
  }, [onTest, t]);

  return (
    <div className="nb-card p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-xl">{icon}</span>
          <h4 className="font-semibold nb-text">{title}</h4>
        </div>
        <div className="flex items-center gap-2">
          {onTest && enabled && (
            <button
              onClick={handleTest}
              disabled={testing}
              className="nb-btn nb-btn-ghost text-sm px-2 py-1"
            >
              {testing ? t('settings.notification.testing') : t('settings.notification.test')}
            </button>
          )}
          <button
            onClick={onToggle}
            className={`relative w-10 h-5 rounded-full border-2 border-[var(--nb-border)] transition-colors ${
              enabled ? 'bg-[var(--nb-accent-green)]' : 'bg-gray-300 dark:bg-gray-600'
            }`}
          >
            <span
              className={`absolute top-0 w-3.5 h-3.5 rounded-full bg-[var(--nb-border)] transition-transform ${
                enabled ? 'left-5' : 'left-0.5'
              }`}
            />
          </button>
        </div>
      </div>
      
      {testResult && (
        <div className={`mb-3 p-2 rounded text-sm ${
          testResult.success 
            ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300' 
            : 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300'
        }`}>
          {testResult.message}
        </div>
      )}
      
      {enabled && (
        <div className="space-y-3">
          {children}
        </div>
      )}
    </div>
  );
};

/**
 * 通知设置组件
 */
export const NotificationSettings: React.FC = () => {
  const { t } = useTranslation();
  const [config, setConfig] = useState<SubscriptionNotificationConfig>(DEFAULT_NOTIFICATION_CONFIG);
  const [barkKeys, setBarkKeys] = useState<BarkKeyConfig[]>([]);
  const [loading, setLoading] = useState(true);

  // 加载配置
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const notifConfig = await getSubscriptionNotificationConfig();
        setConfig(notifConfig);
        
        const keyManager = new BarkKeyManager();
        setBarkKeys(keyManager.getAllKeys());
      } catch (error) {
        console.error('Failed to load notification config:', error);
      } finally {
        setLoading(false);
      }
    };
    loadConfig();
  }, []);

  // 保存配置
  const saveConfig = useCallback(async (newConfig: SubscriptionNotificationConfig) => {
    try {
      await setSubscriptionNotificationConfig(newConfig);
      setConfig(newConfig);
    } catch (error) {
      console.error('Failed to save notification config:', error);
    }
  }, []);

  // Telegram 配置更新
  const updateTelegram = useCallback((updates: Partial<TelegramConfig>) => {
    const newConfig = {
      ...config,
      telegram: { ...config.telegram, ...updates },
    };
    saveConfig(newConfig);
  }, [config, saveConfig]);

  // Email 配置更新
  const updateEmail = useCallback((updates: Partial<EmailConfig>) => {
    const newConfig = {
      ...config,
      email: { ...config.email, ...updates },
    };
    saveConfig(newConfig);
  }, [config, saveConfig]);

  // Webhook 配置更新
  const updateWebhook = useCallback((updates: Partial<WebhookConfig>) => {
    const newConfig = {
      ...config,
      webhook: { ...config.webhook, ...updates },
    };
    saveConfig(newConfig);
  }, [config, saveConfig]);

  // Bark 配置更新
  const updateBark = useCallback((updates: Partial<SubscriptionBarkConfig>) => {
    const newConfig = {
      ...config,
      bark: { ...config.bark, ...updates },
    };
    saveConfig(newConfig);
  }, [config, saveConfig]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <span className="material-symbols-outlined animate-spin text-2xl nb-text-secondary">
          progress_activity
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Telegram */}
      <ChannelCard
        title={t('settings.notification.telegram.title')}
        icon="send"
        enabled={config.telegram.enabled}
        onToggle={() => updateTelegram({ enabled: !config.telegram.enabled })}
        onTest={() => notificationService.testTelegram(config.telegram)}
      >
        <div>
          <label className="block text-sm nb-text-secondary mb-1">
            {t('settings.notification.telegram.botToken')}
          </label>
          <input
            type="password"
            value={config.telegram.botToken}
            onChange={(e) => updateTelegram({ botToken: e.target.value })}
            placeholder={t('settings.notification.telegram.botTokenPlaceholder')}
            className="nb-input w-full text-sm"
          />
        </div>
        <div>
          <label className="block text-sm nb-text-secondary mb-1">
            {t('settings.notification.telegram.chatId')}
          </label>
          <input
            type="text"
            value={config.telegram.chatId}
            onChange={(e) => updateTelegram({ chatId: e.target.value })}
            placeholder={t('settings.notification.telegram.chatIdPlaceholder')}
            className="nb-input w-full text-sm"
          />
        </div>
        <p className="text-xs nb-text-secondary">
          {t('settings.notification.telegram.hint')}
        </p>
      </ChannelCard>

      {/* Email */}
      <ChannelCard
        title={t('settings.notification.email.title')}
        icon="mail"
        enabled={config.email.enabled}
        onToggle={() => updateEmail({ enabled: !config.email.enabled })}
        onTest={() => notificationService.testEmail(config.email)}
      >
        <div>
          <label className="block text-sm nb-text-secondary mb-1">
            {t('settings.notification.email.apiKey')}
          </label>
          <input
            type="password"
            value={config.email.resendApiKey}
            onChange={(e) => updateEmail({ resendApiKey: e.target.value })}
            placeholder={t('settings.notification.email.apiKeyPlaceholder')}
            className="nb-input w-full text-sm"
          />
        </div>
        <div>
          <label className="block text-sm nb-text-secondary mb-1">
            {t('settings.notification.email.recipient')}
          </label>
          <input
            type="email"
            value={config.email.recipientEmail}
            onChange={(e) => updateEmail({ recipientEmail: e.target.value })}
            placeholder={t('settings.notification.email.recipientPlaceholder')}
            className="nb-input w-full text-sm"
          />
        </div>
        <div>
          <label className="block text-sm nb-text-secondary mb-1">
            {t('settings.notification.email.sender')}
          </label>
          <input
            type="email"
            value={config.email.senderEmail || ''}
            onChange={(e) => updateEmail({ senderEmail: e.target.value })}
            placeholder={t('settings.notification.email.senderPlaceholder')}
            className="nb-input w-full text-sm"
          />
        </div>
        <p className="text-xs nb-text-secondary">
          {t('settings.notification.email.hint')}
        </p>
      </ChannelCard>

      {/* Webhook */}
      <ChannelCard
        title={t('settings.notification.webhook.title')}
        icon="webhook"
        enabled={config.webhook.enabled}
        onToggle={() => updateWebhook({ enabled: !config.webhook.enabled })}
        onTest={() => notificationService.testWebhook(config.webhook)}
      >
        <div>
          <label className="block text-sm nb-text-secondary mb-1">
            {t('settings.notification.webhook.url')}
          </label>
          <input
            type="url"
            value={config.webhook.url}
            onChange={(e) => updateWebhook({ url: e.target.value })}
            placeholder={t('settings.notification.webhook.urlPlaceholder')}
            className="nb-input w-full text-sm"
          />
        </div>
        <div>
          <label className="block text-sm nb-text-secondary mb-1">
            {t('settings.notification.webhook.method')}
          </label>
          <select
            value={config.webhook.method || 'POST'}
            onChange={(e) => updateWebhook({ method: e.target.value as 'GET' | 'POST' })}
            className="nb-input w-full text-sm"
          >
            <option value="POST">POST</option>
            <option value="GET">GET</option>
          </select>
        </div>
      </ChannelCard>

      {/* Bark */}
      <ChannelCard
        title={t('settings.notification.bark.title')}
        icon="notifications"
        enabled={config.bark.enabled}
        onToggle={() => updateBark({ enabled: !config.bark.enabled })}
        onTest={() => notificationService.testBark(config.bark)}
      >
        <div className="flex items-center gap-2 mb-2">
          <input
            type="checkbox"
            id="useExistingKey"
            checked={config.bark.useExistingKey}
            onChange={(e) => updateBark({ useExistingKey: e.target.checked })}
            className="w-4 h-4"
          />
          <label htmlFor="useExistingKey" className="text-sm nb-text">
            {t('settings.notification.bark.useExisting')}
          </label>
        </div>
        
        {config.bark.useExistingKey ? (
          <div>
            <label className="block text-sm nb-text-secondary mb-1">
              {t('settings.notification.bark.selectKey')}
            </label>
            <select
              value={config.bark.existingKeyId || ''}
              onChange={(e) => updateBark({ existingKeyId: e.target.value })}
              className="nb-input w-full text-sm"
            >
              <option value="">-- {t('common.select')} --</option>
              {barkKeys.map((key) => (
                <option key={key.id} value={key.id}>
                  {key.label}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <>
            <div>
              <label className="block text-sm nb-text-secondary mb-1">
                {t('settings.notification.bark.server')}
              </label>
              <input
                type="url"
                value={config.bark.server || ''}
                onChange={(e) => updateBark({ server: e.target.value })}
                placeholder={t('settings.notification.bark.serverPlaceholder')}
                className="nb-input w-full text-sm"
              />
            </div>
            <div>
              <label className="block text-sm nb-text-secondary mb-1">
                {t('settings.notification.bark.deviceKey')}
              </label>
              <input
                type="password"
                value={config.bark.deviceKey || ''}
                onChange={(e) => updateBark({ deviceKey: e.target.value })}
                placeholder={t('settings.notification.bark.deviceKeyPlaceholder')}
                className="nb-input w-full text-sm"
              />
            </div>
          </>
        )}
      </ChannelCard>
    </div>
  );
};

export default NotificationSettings;
