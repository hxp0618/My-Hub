import type { SubscriptionNotificationConfig } from '../types/subscription';

export const redactSubscriptionNotificationConfig = (
  config: SubscriptionNotificationConfig
): SubscriptionNotificationConfig => ({
  ...config,
  telegram: {
    ...config.telegram,
    enabled: false,
    botToken: '',
    chatId: '',
  },
  email: {
    ...config.email,
    enabled: false,
    resendApiKey: '',
    recipientEmail: '',
    senderEmail: '',
  },
  webhook: {
    ...config.webhook,
    enabled: false,
    url: '',
    headers: undefined,
  },
  bark: {
    ...config.bark,
    enabled: false,
    existingKeyId: undefined,
    server: '',
    deviceKey: '',
  },
});

export const isRedactedSubscriptionNotificationConfig = (
  config: SubscriptionNotificationConfig
): boolean => (
  !config.telegram.enabled &&
  !config.telegram.botToken &&
  !config.telegram.chatId &&
  !config.email.enabled &&
  !config.email.resendApiKey &&
  !config.email.recipientEmail &&
  !config.email.senderEmail &&
  !config.webhook.enabled &&
  !config.webhook.url &&
  !config.webhook.headers &&
  !config.bark.enabled &&
  !config.bark.existingKeyId &&
  !config.bark.server &&
  !config.bark.deviceKey
);

export const mergeSubscriptionNotificationConfigForImport = (
  incoming: SubscriptionNotificationConfig,
  existing: SubscriptionNotificationConfig
): SubscriptionNotificationConfig => (
  isRedactedSubscriptionNotificationConfig(incoming) ? existing : incoming
);
