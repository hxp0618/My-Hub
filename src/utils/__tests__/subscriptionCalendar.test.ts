import { describe, expect, it } from 'vitest';
import type { Subscription } from '../../types/subscription';
import {
  buildSubscriptionCalendar,
  filterSubscriptionsByMonth,
  getSubscriptionCalendarSummary,
  getSubscriptionMonthKey,
} from '../subscriptionCalendar';

const subscription = (overrides: Partial<Subscription>): Subscription => ({
  id: overrides.id ?? 'sub_1',
  name: overrides.name ?? 'Example',
  type: overrides.type ?? 'software',
  cycle: overrides.cycle ?? 'monthly',
  expiryDate: overrides.expiryDate ?? new Date('2026-05-28T10:00:00').getTime(),
  reminderDays: overrides.reminderDays ?? 7,
  notificationChannels: overrides.notificationChannels ?? [],
  status: overrides.status ?? 'active',
  isEnabled: overrides.isEnabled ?? true,
  createdAt: overrides.createdAt ?? Date.now(),
  updatedAt: overrides.updatedAt ?? Date.now(),
  ...overrides,
});

describe('subscription calendar utilities', () => {
  const now = new Date('2026-05-25T12:00:00').getTime();

  it('builds local month buckets and counts subscription states', () => {
    const calendar = buildSubscriptionCalendar([
      subscription({ id: 'expired', name: 'Expired', expiryDate: new Date('2026-05-01T08:00:00').getTime() }),
      subscription({ id: 'upcoming', name: 'Upcoming', expiryDate: new Date('2026-05-28T08:00:00').getTime() }),
      subscription({ id: 'disabled', name: 'Disabled', isEnabled: false, expiryDate: new Date('2026-06-05T08:00:00').getTime() }),
      subscription({ id: 'later', name: 'Later', expiryDate: new Date('2026-07-10T08:00:00').getTime() }),
    ], now, 3);

    expect(calendar.map((month) => month.key)).toEqual(['2026-05', '2026-06', '2026-07']);
    expect(calendar[0]).toMatchObject({
      expiredCount: 1,
      upcomingCount: 1,
      disabledCount: 0,
    });
    expect(calendar[0].subscriptions.map((item) => item.id)).toEqual(['expired', 'upcoming']);
    expect(calendar[1]).toMatchObject({
      expiredCount: 0,
      upcomingCount: 0,
      disabledCount: 1,
    });
  });

  it('summarizes expired, this-month, and next-30-day subscriptions', () => {
    const summary = getSubscriptionCalendarSummary([
      subscription({ id: 'expired', expiryDate: new Date('2026-05-20T08:00:00').getTime() }),
      subscription({ id: 'this-month', expiryDate: new Date('2026-05-28T08:00:00').getTime() }),
      subscription({ id: 'next-month', expiryDate: new Date('2026-06-20T08:00:00').getTime() }),
      subscription({ id: 'disabled', isEnabled: false, expiryDate: new Date('2026-05-30T08:00:00').getTime() }),
    ], now);

    expect(summary).toEqual({
      total: 4,
      enabled: 3,
      disabled: 1,
      expired: 1,
      thisMonth: 1,
      next30Days: 2,
    });
  });

  it('filters subscriptions by expiry month key', () => {
    const subscriptions = [
      subscription({ id: 'may', expiryDate: new Date('2026-05-28T08:00:00').getTime() }),
      subscription({ id: 'june', expiryDate: new Date('2026-06-01T08:00:00').getTime() }),
    ];

    expect(getSubscriptionMonthKey(subscriptions[0].expiryDate)).toBe('2026-05');
    expect(filterSubscriptionsByMonth(subscriptions, '2026-06').map((item) => item.id)).toEqual(['june']);
    expect(filterSubscriptionsByMonth(subscriptions, null)).toHaveLength(2);
  });
});
