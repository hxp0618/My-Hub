import { SubscriptionError, SubscriptionErrorCode } from '../types/subscription';

export type SubscriptionErrorContext = 'default' | 'renew';

export function getSubscriptionErrorMessageKey(
  error: unknown,
  context: SubscriptionErrorContext = 'default'
): string {
  if (!(error instanceof SubscriptionError)) {
    return 'subscriptions.feedback.errors.generic';
  }

  switch (error.code) {
    case SubscriptionErrorCode.INVALID_NAME:
      return 'subscriptions.feedback.errors.invalidName';
    case SubscriptionErrorCode.INVALID_DATE:
      return context === 'renew'
        ? 'subscriptions.feedback.errors.oneTimeRenew'
        : 'subscriptions.feedback.errors.invalidDate';
    case SubscriptionErrorCode.NOT_FOUND:
      return 'subscriptions.feedback.errors.notFound';
    case SubscriptionErrorCode.STORAGE_ERROR:
      return 'subscriptions.feedback.errors.storageError';
    default:
      return 'subscriptions.feedback.errors.generic';
  }
}
