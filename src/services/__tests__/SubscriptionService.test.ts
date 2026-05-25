import { describe, expect, it } from 'vitest';
import type { Subscription } from '../../types/subscription';
import {
  calculateStatus,
  getRemainingDays,
  isExpiringSoon,
} from '../SubscriptionService';

const subscription = (overrides: Partial<Subscription>): Subscription => ({
  id: overrides.id ?? 'sub_1',
  name: overrides.name ?? 'Example',
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

describe('subscription date status helpers', () => {
  it('treats a subscription as active during its expiry day', () => {
    const expiryDate = new Date(2026, 4, 25, 0, 0, 0, 0).getTime();
    const noonOnExpiryDay = new Date(2026, 4, 25, 12, 0, 0, 0).getTime();

    expect(getRemainingDays(expiryDate, noonOnExpiryDay)).toBe(0);
    expect(calculateStatus(subscription({ expiryDate }), noonOnExpiryDay)).toBe('active');
  });

  it('marks enabled subscriptions as expired only after the expiry date', () => {
    const expiryDate = new Date(2026, 4, 25, 0, 0, 0, 0).getTime();
    const nextDay = new Date(2026, 4, 26, 0, 1, 0, 0).getTime();

    expect(calculateStatus(subscription({ expiryDate }), nextDay)).toBe('expired');
  });

  it('keeps disabled subscriptions disabled regardless of expiry date', () => {
    const expiryDate = new Date(2026, 4, 20, 0, 0, 0, 0).getTime();
    const currentDate = new Date(2026, 4, 26, 0, 1, 0, 0).getTime();

    expect(calculateStatus(subscription({ expiryDate, isEnabled: false }), currentDate)).toBe('disabled');
  });

  it('includes today in the expiring-soon reminder window', () => {
    const expiryDate = new Date(2026, 4, 25, 0, 0, 0, 0).getTime();
    const currentDate = new Date(2026, 4, 25, 20, 0, 0, 0).getTime();

    expect(isExpiringSoon(subscription({ expiryDate, reminderDays: 0 }), currentDate)).toBe(true);
  });
});
