import { describe, expect, it } from 'vitest';
import {
  SubscriptionError,
  SubscriptionErrorCode,
} from '../../types/subscription';
import { getSubscriptionErrorMessageKey } from '../subscriptionErrorMessages';

describe('subscription error message keys', () => {
  it('maps known subscription errors to i18n keys', () => {
    expect(getSubscriptionErrorMessageKey(new SubscriptionError(SubscriptionErrorCode.INVALID_NAME, ''))).toBe(
      'subscriptions.feedback.errors.invalidName'
    );
    expect(getSubscriptionErrorMessageKey(new SubscriptionError(SubscriptionErrorCode.NOT_FOUND, ''))).toBe(
      'subscriptions.feedback.errors.notFound'
    );
    expect(getSubscriptionErrorMessageKey(new SubscriptionError(SubscriptionErrorCode.STORAGE_ERROR, ''))).toBe(
      'subscriptions.feedback.errors.storageError'
    );
  });

  it('uses a renew-specific message for one-time subscriptions', () => {
    const error = new SubscriptionError(SubscriptionErrorCode.INVALID_DATE, '');

    expect(getSubscriptionErrorMessageKey(error)).toBe('subscriptions.feedback.errors.invalidDate');
    expect(getSubscriptionErrorMessageKey(error, 'renew')).toBe('subscriptions.feedback.errors.oneTimeRenew');
  });

  it('falls back to a generic message for unknown errors', () => {
    expect(getSubscriptionErrorMessageKey(new Error('boom'))).toBe('subscriptions.feedback.errors.generic');
  });
});
