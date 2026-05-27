import { describe, expect, it } from 'vitest';
import { parseSubscriptionReminderDays } from '../subscription/SubscriptionForm';

describe('SubscriptionForm helpers', () => {
  it('strictly parses reminder days and clamps to the supported range', () => {
    expect(parseSubscriptionReminderDays('14', 7)).toBe(14);
    expect(parseSubscriptionReminderDays(' 14 ', 7)).toBe(14);
    expect(parseSubscriptionReminderDays('0014', 7)).toBe(14);
    expect(parseSubscriptionReminderDays('999', 7)).toBe(365);
    expect(parseSubscriptionReminderDays(999, 7)).toBe(365);
  });

  it('falls back for malformed or unsafe reminder day values', () => {
    expect(parseSubscriptionReminderDays('12abc', 7)).toBe(7);
    expect(parseSubscriptionReminderDays('12.5', 7)).toBe(7);
    expect(parseSubscriptionReminderDays('-1', 7)).toBe(7);
    expect(parseSubscriptionReminderDays('', 7)).toBe(7);
    expect(parseSubscriptionReminderDays(Number.NaN, 7)).toBe(7);
    expect(parseSubscriptionReminderDays('5', Number.NaN)).toBe(5);
    expect(parseSubscriptionReminderDays('bad', 999)).toBe(365);
  });
});
