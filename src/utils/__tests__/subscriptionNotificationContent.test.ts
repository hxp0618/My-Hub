import { describe, expect, it } from 'vitest';
import type { Subscription } from '../../types/subscription';
import {
  formatSubscriptionNotificationContent,
  formatSubscriptionTestNotificationContent,
  getSubscriptionNotificationErrorMessage,
} from '../subscriptionNotificationContent';

const subscription = (overrides: Partial<Subscription> = {}): Subscription => ({
  id: overrides.id ?? 'sub_1',
  name: overrides.name ?? 'Example Pro',
  type: overrides.type ?? 'software',
  cycle: overrides.cycle ?? 'monthly',
  expiryDate: overrides.expiryDate ?? new Date(2026, 4, 25).getTime(),
  reminderDays: overrides.reminderDays ?? 7,
  notificationChannels: overrides.notificationChannels ?? [],
  status: overrides.status ?? 'active',
  isEnabled: overrides.isEnabled ?? true,
  createdAt: overrides.createdAt ?? Date.now(),
  updatedAt: overrides.updatedAt ?? Date.now(),
  ...overrides,
});

describe('formatSubscriptionNotificationContent', () => {
  it('formats Chinese expiry-today notifications', () => {
    const content = formatSubscriptionNotificationContent(subscription(), {
      currentDate: new Date(2026, 4, 25, 12).getTime(),
      locale: 'zh-CN',
    });

    expect(content.title).toBe('🔔 订阅今日到期: Example Pro');
    expect(content.body).toContain('将于今日');
    expect(content.remainingDays).toBe(0);
  });

  it('formats English upcoming notifications', () => {
    const content = formatSubscriptionNotificationContent(subscription(), {
      currentDate: new Date(2026, 4, 20, 12).getTime(),
      locale: 'en-US',
    });

    expect(content.title).toBe('📅 Subscription expiring soon: Example Pro');
    expect(content.body).toContain('5 days remaining');
    expect(content.remainingDays).toBe(5);
  });

  it('can append the subscription URL for channel messages', () => {
    const content = formatSubscriptionNotificationContent(subscription({ url: 'https://example.com/billing' }), {
      currentDate: new Date(2026, 4, 26, 12).getTime(),
      includeUrl: true,
      locale: 'en-US',
    });

    expect(content.title).toBe('⚠️ Subscription expired: Example Pro');
    expect(content.body).toContain('https://example.com/billing');
    expect(content.remainingDays).toBe(-1);
  });

  it('formats Chinese test notifications', () => {
    const content = formatSubscriptionTestNotificationContent('Telegram', {
      currentDate: new Date(2026, 4, 20, 12).getTime(),
      locale: 'zh-CN',
    });

    expect(content.title).toBe('🔔 测试通知');
    expect(content.body).toContain('验证 Telegram 配置');
    expect(content.subscriptionName).toBe('测试订阅');
    expect(content.remainingDays).toBe(7);
  });

  it('formats English test notifications', () => {
    const content = formatSubscriptionTestNotificationContent('Email', {
      currentDate: new Date(2026, 4, 20, 12).getTime(),
      locale: 'en-US',
    });

    expect(content.title).toBe('🔔 Test notification');
    expect(content.body).toContain('Email configuration works');
    expect(content.subscriptionName).toBe('Test subscription');
    expect(content.remainingDays).toBe(7);
  });

  it('formats notification error fallbacks by locale', () => {
    expect(getSubscriptionNotificationErrorMessage('incompleteConfig', 'zh-CN')).toBe('配置不完整');
    expect(getSubscriptionNotificationErrorMessage('incompleteConfig', 'en-US')).toBe('Configuration incomplete');
    expect(getSubscriptionNotificationErrorMessage('missingBarkKey', 'en-US')).toBe('Configured Bark key not found');
  });
});
