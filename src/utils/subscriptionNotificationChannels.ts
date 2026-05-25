import type {
  NotificationChannel,
  Subscription,
  SubscriptionNotificationConfig,
} from '../types/subscription';

export function getEnabledSubscriptionNotificationChannels(
  subscription: Subscription,
  config: SubscriptionNotificationConfig
): NotificationChannel[] {
  const selectedChannels = subscription.notificationChannels || [];

  return selectedChannels.filter((channel) => {
    switch (channel) {
      case 'telegram':
        return config.telegram.enabled;
      case 'email':
        return config.email.enabled;
      case 'webhook':
        return config.webhook.enabled;
      case 'bark':
        return config.bark.enabled;
      default:
        return false;
    }
  });
}
