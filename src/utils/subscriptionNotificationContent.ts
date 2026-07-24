import type { NotificationContent, Subscription } from '../types/subscription';
import { getRemainingDays } from '../services/SubscriptionService';
import { formatLocalizedDate, getPreferredLocale } from './localizedDate';

interface FormatSubscriptionNotificationOptions {
  currentDate?: number;
  includeUrl?: boolean;
  locale?: string;
}

interface FormatSubscriptionTestNotificationOptions {
  currentDate?: number;
  locale?: string;
}

export type SubscriptionNotificationErrorKey =
  | 'incompleteConfig'
  | 'disabled'
  | 'missingBarkKey'
  | 'sendFailed'
  | 'hostPermissionDenied'
  | 'networkError';

function isChineseLocale(locale: string): boolean {
  return locale.toLowerCase().startsWith('zh');
}

export function formatSubscriptionNotificationContent(
  subscription: Subscription,
  options: FormatSubscriptionNotificationOptions = {}
): NotificationContent {
  const locale = options.locale ?? getPreferredLocale();
  const currentDate = options.currentDate ?? Date.now();
  const remainingDays = getRemainingDays(subscription.expiryDate, currentDate);
  const expiryDateStr = formatLocalizedDate(subscription.expiryDate, locale);
  const isZh = isChineseLocale(locale);

  let title: string;
  let body: string;

  if (isZh) {
    if (remainingDays < 0) {
      title = `⚠️ 订阅已过期: ${subscription.name}`;
      body = `您的订阅「${subscription.name}」已于 ${expiryDateStr} 过期，已过期 ${Math.abs(remainingDays)} 天。`;
    } else if (remainingDays === 0) {
      title = `🔔 订阅今日到期: ${subscription.name}`;
      body = `您的订阅「${subscription.name}」将于今日（${expiryDateStr}）到期，请及时续费。`;
    } else {
      title = `📅 订阅即将到期: ${subscription.name}`;
      body = `您的订阅「${subscription.name}」将于 ${expiryDateStr} 到期，还剩 ${remainingDays} 天。`;
    }
  } else if (remainingDays < 0) {
    title = `⚠️ Subscription expired: ${subscription.name}`;
    body = `Your subscription "${subscription.name}" expired on ${expiryDateStr}, ${Math.abs(remainingDays)} days ago.`;
  } else if (remainingDays === 0) {
    title = `🔔 Subscription expires today: ${subscription.name}`;
    body = `Your subscription "${subscription.name}" expires today (${expiryDateStr}). Please renew it in time.`;
  } else {
    title = `📅 Subscription expiring soon: ${subscription.name}`;
    body = `Your subscription "${subscription.name}" expires on ${expiryDateStr}. ${remainingDays} days remaining.`;
  }

  if (options.includeUrl && subscription.url) {
    body += `\n\n🔗 ${subscription.url}`;
  }

  return {
    title,
    body,
    subscriptionName: subscription.name,
    expiryDate: expiryDateStr,
    remainingDays,
  };
}

export function formatSubscriptionTestNotificationContent(
  channelLabel: string,
  options: FormatSubscriptionTestNotificationOptions = {}
): NotificationContent {
  const locale = options.locale ?? getPreferredLocale();
  const currentDate = options.currentDate ?? Date.now();
  const expiryDate = currentDate + 7 * 24 * 60 * 60 * 1000;
  const isZh = isChineseLocale(locale);

  return {
    title: isZh ? '🔔 测试通知' : '🔔 Test notification',
    body: isZh
      ? `这是一条测试通知，用于验证 ${channelLabel} 配置是否正确。`
      : `This is a test notification to verify that the ${channelLabel} configuration works.`,
    subscriptionName: isZh ? '测试订阅' : 'Test subscription',
    expiryDate: formatLocalizedDate(expiryDate, locale),
    remainingDays: 7,
  };
}

export function getSubscriptionNotificationErrorMessage(
  key: SubscriptionNotificationErrorKey,
  locale: string = getPreferredLocale()
): string {
  const isZh = isChineseLocale(locale);
  const messages: Record<SubscriptionNotificationErrorKey, string> = isZh
    ? {
      incompleteConfig: '配置不完整',
      disabled: '未启用',
      missingBarkKey: '找不到已配置的 Bark Key',
      sendFailed: '发送失败',
      hostPermissionDenied: '未授予该服务地址的访问权限',
      networkError: '网络错误',
    }
    : {
      incompleteConfig: 'Configuration incomplete',
      disabled: 'Not enabled',
      missingBarkKey: 'Configured Bark key not found',
      sendFailed: 'Send failed',
      hostPermissionDenied: 'Access to this service address was not granted',
      networkError: 'Network error',
    };

  return messages[key];
}
