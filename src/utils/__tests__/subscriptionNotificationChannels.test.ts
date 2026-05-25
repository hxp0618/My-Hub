import { describe, expect, it } from 'vitest';
import type {
  NotificationChannel,
  Subscription,
  SubscriptionNotificationConfig,
} from '../../types/subscription';
import { DEFAULT_NOTIFICATION_CONFIG } from '../../types/subscription';
import { getEnabledSubscriptionNotificationChannels } from '../subscriptionNotificationChannels';

const subscription = (notificationChannels: NotificationChannel[]): Subscription => ({
  id: 'sub_1',
  name: 'Example',
  type: 'software',
  cycle: 'monthly',
  expiryDate: new Date(2026, 4, 25).getTime(),
  reminderDays: 7,
  notificationChannels,
  status: 'active',
  isEnabled: true,
  createdAt: Date.now(),
  updatedAt: Date.now(),
});

const config = (overrides: Partial<SubscriptionNotificationConfig>): SubscriptionNotificationConfig => ({
  ...DEFAULT_NOTIFICATION_CONFIG,
  ...overrides,
});

describe('getEnabledSubscriptionNotificationChannels', () => {
  it('returns only channels selected by the subscription and enabled globally', () => {
    const channels = getEnabledSubscriptionNotificationChannels(
      subscription(['telegram', 'email', 'webhook']),
      config({
        telegram: { enabled: true, botToken: 'token', chatId: 'chat' },
        email: { enabled: false, resendApiKey: 'key', recipientEmail: 'user@example.com' },
        webhook: { enabled: true, url: 'https://example.com/webhook' },
      })
    );

    expect(channels).toEqual(['telegram', 'webhook']);
  });

  it('does not send globally enabled channels that the subscription did not select', () => {
    const channels = getEnabledSubscriptionNotificationChannels(
      subscription(['email']),
      config({
        telegram: { enabled: true, botToken: 'token', chatId: 'chat' },
        email: { enabled: true, resendApiKey: 'key', recipientEmail: 'user@example.com' },
      })
    );

    expect(channels).toEqual(['email']);
  });

  it('returns an empty list when the subscription has no notification channels', () => {
    const channels = getEnabledSubscriptionNotificationChannels(
      subscription([]),
      config({
        telegram: { enabled: true, botToken: 'token', chatId: 'chat' },
      })
    );

    expect(channels).toEqual([]);
  });
});
