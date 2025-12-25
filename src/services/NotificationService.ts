/**
 * 订阅通知服务
 * 提供多渠道通知发送功能（Telegram、Email、Webhook、Bark）
 */
import {
  SubscriptionNotificationConfig,
  NotificationContent,
  TelegramConfig,
  EmailConfig,
  WebhookConfig,
  SubscriptionBarkConfig,
  SubscriptionError,
  SubscriptionErrorCode,
  Subscription,
} from '../types/subscription';
import {
  getSubscriptionNotificationConfig,
  setSubscriptionNotificationConfig,
} from '../db/indexedDB';
import { BarkKeyManager } from './BarkKeyManager';
import { getRemainingDays } from './SubscriptionService';

/**
 * 通知发送结果
 */
export interface NotificationResult {
  success: boolean;
  channel: string;
  error?: string;
}

/**
 * 格式化日期为本地字符串
 */
function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * 格式化通知内容
 * @param subscription 订阅信息
 * @param currentDate 当前日期（用于计算剩余天数）
 * @returns 通知内容对象
 */
export function formatNotificationContent(
  subscription: Subscription,
  currentDate: number = Date.now()
): NotificationContent {
  const remainingDays = getRemainingDays(subscription.expiryDate, currentDate);
  const expiryDateStr = formatDate(subscription.expiryDate);
  
  let title: string;
  let body: string;
  
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
  
  return {
    title,
    body,
    subscriptionName: subscription.name,
    expiryDate: expiryDateStr,
    remainingDays,
  };
}

/**
 * 发送 Telegram 通知
 */
async function sendTelegramNotification(
  config: TelegramConfig,
  content: NotificationContent
): Promise<NotificationResult> {
  if (!config.enabled || !config.botToken || !config.chatId) {
    return { success: false, channel: 'telegram', error: '配置不完整' };
  }
  
  try {
    const message = `${content.title}\n\n${content.body}`;
    const url = `https://api.telegram.org/bot${config.botToken}/sendMessage`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: config.chatId,
        text: message,
        parse_mode: 'HTML',
      }),
    });
    
    const data = await response.json();
    
    if (data.ok) {
      return { success: true, channel: 'telegram' };
    } else {
      return { success: false, channel: 'telegram', error: data.description || '发送失败' };
    }
  } catch (error) {
    return {
      success: false,
      channel: 'telegram',
      error: error instanceof Error ? error.message : '网络错误',
    };
  }
}

/**
 * 发送邮件通知（使用 Resend API）
 */
async function sendEmailNotification(
  config: EmailConfig,
  content: NotificationContent
): Promise<NotificationResult> {
  if (!config.enabled || !config.resendApiKey || !config.recipientEmail) {
    return { success: false, channel: 'email', error: '配置不完整' };
  }
  
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.resendApiKey}`,
      },
      body: JSON.stringify({
        from: config.senderEmail || 'onboarding@resend.dev',
        to: config.recipientEmail,
        subject: content.title,
        text: content.body,
      }),
    });
    
    if (response.ok) {
      return { success: true, channel: 'email' };
    } else {
      const data = await response.json();
      return { success: false, channel: 'email', error: data.message || '发送失败' };
    }
  } catch (error) {
    return {
      success: false,
      channel: 'email',
      error: error instanceof Error ? error.message : '网络错误',
    };
  }
}

/**
 * 发送 Webhook 通知
 */
async function sendWebhookNotification(
  config: WebhookConfig,
  content: NotificationContent
): Promise<NotificationResult> {
  if (!config.enabled || !config.url) {
    return { success: false, channel: 'webhook', error: '配置不完整' };
  }
  
  try {
    const method = config.method || 'POST';
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...config.headers,
    };
    
    const payload = {
      title: content.title,
      body: content.body,
      subscriptionName: content.subscriptionName,
      expiryDate: content.expiryDate,
      remainingDays: content.remainingDays,
      timestamp: Date.now(),
    };
    
    const fetchOptions: RequestInit = {
      method,
      headers,
    };
    
    if (method === 'POST') {
      fetchOptions.body = JSON.stringify(payload);
    }
    
    const response = await fetch(config.url, fetchOptions);
    
    if (response.ok) {
      return { success: true, channel: 'webhook' };
    } else {
      return { success: false, channel: 'webhook', error: `HTTP ${response.status}` };
    }
  } catch (error) {
    return {
      success: false,
      channel: 'webhook',
      error: error instanceof Error ? error.message : '网络错误',
    };
  }
}

/**
 * 发送 Bark 通知
 */
async function sendBarkNotification(
  config: SubscriptionBarkConfig,
  content: NotificationContent
): Promise<NotificationResult> {
  if (!config.enabled) {
    return { success: false, channel: 'bark', error: '未启用' };
  }
  
  try {
    let server: string;
    let deviceKey: string;
    
    if (config.useExistingKey && config.existingKeyId) {
      // 使用已配置的 Bark Key
      const keyManager = new BarkKeyManager();
      const keys = keyManager.getAllKeys();
      const existingKey = keys.find(k => k.id === config.existingKeyId);
      
      if (!existingKey) {
        return { success: false, channel: 'bark', error: '找不到已配置的 Bark Key' };
      }
      
      server = existingKey.server;
      deviceKey = existingKey.deviceKey;
    } else if (config.server && config.deviceKey) {
      // 使用自定义配置
      server = config.server;
      deviceKey = config.deviceKey;
    } else {
      return { success: false, channel: 'bark', error: '配置不完整' };
    }
    
    // 构建 Bark URL
    const title = encodeURIComponent(content.title);
    const body = encodeURIComponent(content.body);
    const url = `${server}/${deviceKey}/${title}/${body}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.code === 200) {
      return { success: true, channel: 'bark' };
    } else {
      return { success: false, channel: 'bark', error: data.message || '发送失败' };
    }
  } catch (error) {
    return {
      success: false,
      channel: 'bark',
      error: error instanceof Error ? error.message : '网络错误',
    };
  }
}

/**
 * 通知服务类
 */
class NotificationService {
  /**
   * 获取通知配置
   */
  async getConfig(): Promise<SubscriptionNotificationConfig> {
    return getSubscriptionNotificationConfig();
  }
  
  /**
   * 保存通知配置
   */
  async saveConfig(config: SubscriptionNotificationConfig): Promise<void> {
    return setSubscriptionNotificationConfig(config);
  }
  
  /**
   * 更新单个渠道配置
   */
  async updateChannelConfig<K extends keyof SubscriptionNotificationConfig>(
    channel: K,
    config: SubscriptionNotificationConfig[K]
  ): Promise<void> {
    const currentConfig = await this.getConfig();
    currentConfig[channel] = config;
    await this.saveConfig(currentConfig);
  }
  
  /**
   * 发送订阅到期提醒
   * @param subscription 订阅信息
   * @returns 各渠道发送结果
   */
  async sendReminder(subscription: Subscription): Promise<NotificationResult[]> {
    const config = await this.getConfig();
    const content = formatNotificationContent(subscription);
    const results: NotificationResult[] = [];
    
    // 并行发送所有启用的渠道
    const promises: Promise<NotificationResult>[] = [];
    
    if (config.telegram.enabled) {
      promises.push(sendTelegramNotification(config.telegram, content));
    }
    
    if (config.email.enabled) {
      promises.push(sendEmailNotification(config.email, content));
    }
    
    if (config.webhook.enabled) {
      promises.push(sendWebhookNotification(config.webhook, content));
    }
    
    if (config.bark.enabled) {
      promises.push(sendBarkNotification(config.bark, content));
    }
    
    const settledResults = await Promise.allSettled(promises);
    
    for (const result of settledResults) {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      } else {
        results.push({
          success: false,
          channel: 'unknown',
          error: result.reason?.message || '发送失败',
        });
      }
    }
    
    return results;
  }
  
  /**
   * 测试 Telegram 通知
   */
  async testTelegram(config: TelegramConfig): Promise<NotificationResult> {
    const testContent: NotificationContent = {
      title: '🔔 测试通知',
      body: '这是一条测试通知，用于验证 Telegram 配置是否正确。',
      subscriptionName: '测试订阅',
      expiryDate: formatDate(Date.now() + 7 * 24 * 60 * 60 * 1000),
      remainingDays: 7,
    };
    
    return sendTelegramNotification(config, testContent);
  }
  
  /**
   * 测试邮件通知
   */
  async testEmail(config: EmailConfig): Promise<NotificationResult> {
    const testContent: NotificationContent = {
      title: '🔔 测试通知',
      body: '这是一条测试通知，用于验证邮件配置是否正确。',
      subscriptionName: '测试订阅',
      expiryDate: formatDate(Date.now() + 7 * 24 * 60 * 60 * 1000),
      remainingDays: 7,
    };
    
    return sendEmailNotification(config, testContent);
  }
  
  /**
   * 测试 Webhook 通知
   */
  async testWebhook(config: WebhookConfig): Promise<NotificationResult> {
    const testContent: NotificationContent = {
      title: '🔔 测试通知',
      body: '这是一条测试通知，用于验证 Webhook 配置是否正确。',
      subscriptionName: '测试订阅',
      expiryDate: formatDate(Date.now() + 7 * 24 * 60 * 60 * 1000),
      remainingDays: 7,
    };
    
    return sendWebhookNotification(config, testContent);
  }
  
  /**
   * 测试 Bark 通知
   */
  async testBark(config: SubscriptionBarkConfig): Promise<NotificationResult> {
    const testContent: NotificationContent = {
      title: '🔔 测试通知',
      body: '这是一条测试通知，用于验证 Bark 配置是否正确。',
      subscriptionName: '测试订阅',
      expiryDate: formatDate(Date.now() + 7 * 24 * 60 * 60 * 1000),
      remainingDays: 7,
    };
    
    return sendBarkNotification(config, testContent);
  }
  
  /**
   * 检查是否有任何通知渠道已启用
   */
  async hasEnabledChannel(): Promise<boolean> {
    const config = await this.getConfig();
    return (
      config.telegram.enabled ||
      config.email.enabled ||
      config.webhook.enabled ||
      config.bark.enabled
    );
  }
  
  /**
   * 获取已启用的通知渠道列表
   */
  async getEnabledChannels(): Promise<string[]> {
    const config = await this.getConfig();
    const channels: string[] = [];
    
    if (config.telegram.enabled) channels.push('telegram');
    if (config.email.enabled) channels.push('email');
    if (config.webhook.enabled) channels.push('webhook');
    if (config.bark.enabled) channels.push('bark');
    
    return channels;
  }
}

// 导出单例
export const notificationService = new NotificationService();
export default notificationService;
