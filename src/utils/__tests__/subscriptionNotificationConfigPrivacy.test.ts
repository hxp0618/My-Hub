import { describe, expect, it } from 'vitest';
import type { SubscriptionNotificationConfig } from '../../types/subscription';
import {
  isRedactedSubscriptionNotificationConfig,
  mergeSubscriptionNotificationConfigForImport,
  redactSubscriptionNotificationConfig,
} from '../subscriptionNotificationConfigPrivacy';

const fullConfig: SubscriptionNotificationConfig = {
  telegram: {
    enabled: true,
    botToken: 'telegram-token',
    chatId: 'chat-id',
  },
  email: {
    enabled: true,
    resendApiKey: 'resend-key',
    recipientEmail: 'user@example.com',
    senderEmail: 'sender@example.com',
  },
  webhook: {
    enabled: true,
    url: 'https://hooks.example.com/secret',
    method: 'POST',
    headers: {
      Authorization: 'Bearer webhook-token',
    },
  },
  bark: {
    enabled: true,
    useExistingKey: true,
    existingKeyId: 'bark-key-id',
    server: 'https://api.day.app',
    deviceKey: 'device-key',
  },
};

describe('subscription notification config privacy helpers', () => {
  it('redacts credentials and disables notification channels', () => {
    const redacted = redactSubscriptionNotificationConfig(fullConfig);

    expect(redacted.telegram).toMatchObject({ enabled: false, botToken: '', chatId: '' });
    expect(redacted.email).toMatchObject({
      enabled: false,
      resendApiKey: '',
      recipientEmail: '',
      senderEmail: '',
    });
    expect(redacted.webhook).toMatchObject({ enabled: false, url: '', method: 'POST' });
    expect(redacted.webhook.headers).toBeUndefined();
    expect(redacted.bark).toMatchObject({
      enabled: false,
      useExistingKey: true,
      server: '',
      deviceKey: '',
    });
    expect(redacted.bark.existingKeyId).toBeUndefined();
    expect(isRedactedSubscriptionNotificationConfig(redacted)).toBe(true);
  });

  it('preserves existing config when importing a redacted safe backup', () => {
    const redacted = redactSubscriptionNotificationConfig(fullConfig);

    expect(mergeSubscriptionNotificationConfigForImport(redacted, fullConfig)).toBe(fullConfig);
  });
});
