import type { Subscription } from '../types/subscription';
import { getRemainingDays } from '../services/SubscriptionService';

export interface SubscriptionCalendarMonth {
  key: string;
  year: number;
  month: number;
  startDate: number;
  endDate: number;
  subscriptions: Subscription[];
  expiredCount: number;
  disabledCount: number;
  upcomingCount: number;
}

export interface SubscriptionCalendarSummary {
  total: number;
  enabled: number;
  disabled: number;
  expired: number;
  thisMonth: number;
  next30Days: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfLocalDay(timestamp: number): number {
  const date = new Date(timestamp);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

function createMonthStart(year: number, month: number): Date {
  return new Date(year, month, 1, 0, 0, 0, 0);
}

export function getSubscriptionMonthKey(timestamp: number): string {
  const date = new Date(timestamp);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function filterSubscriptionsByMonth(
  subscriptions: Subscription[],
  monthKey: string | null
): Subscription[] {
  if (!monthKey) {
    return subscriptions;
  }

  return subscriptions.filter((subscription) => getSubscriptionMonthKey(subscription.expiryDate) === monthKey);
}

export function getSubscriptionCalendarSummary(
  subscriptions: Subscription[],
  currentDate: number = Date.now()
): SubscriptionCalendarSummary {
  const todayStart = startOfLocalDay(currentDate);
  const currentMonthKey = getSubscriptionMonthKey(currentDate);

  return subscriptions.reduce<SubscriptionCalendarSummary>((summary, subscription) => {
    const remainingDays = getRemainingDays(subscription.expiryDate, currentDate);
    const isEnabled = subscription.isEnabled;

    summary.total += 1;
    if (isEnabled) {
      summary.enabled += 1;
    } else {
      summary.disabled += 1;
    }

    if (isEnabled && remainingDays < 0) {
      summary.expired += 1;
    }

    if (
      isEnabled &&
      subscription.expiryDate >= todayStart &&
      getSubscriptionMonthKey(subscription.expiryDate) === currentMonthKey
    ) {
      summary.thisMonth += 1;
    }

    if (isEnabled && remainingDays >= 0 && remainingDays <= 30) {
      summary.next30Days += 1;
    }

    return summary;
  }, {
    total: 0,
    enabled: 0,
    disabled: 0,
    expired: 0,
    thisMonth: 0,
    next30Days: 0,
  });
}

export function buildSubscriptionCalendar(
  subscriptions: Subscription[],
  currentDate: number = Date.now(),
  monthsAhead = 6
): SubscriptionCalendarMonth[] {
  const monthCount = Math.max(0, Math.floor(monthsAhead));
  if (monthCount === 0) {
    return [];
  }

  const anchor = new Date(currentDate);
  const todayStart = startOfLocalDay(currentDate);

  return Array.from({ length: monthCount }, (_, index) => {
    const start = createMonthStart(anchor.getFullYear(), anchor.getMonth() + index);
    const nextStart = createMonthStart(start.getFullYear(), start.getMonth() + 1);
    const key = getSubscriptionMonthKey(start.getTime());

    // 月份范围使用半开区间，避免月末 23:59:59 和下月 00:00:00 的边界重复。
    const monthSubscriptions = subscriptions
      .filter((subscription) => subscription.expiryDate >= start.getTime() && subscription.expiryDate < nextStart.getTime())
      .sort((a, b) => a.expiryDate - b.expiryDate);

    return monthSubscriptions.reduce<SubscriptionCalendarMonth>((month, subscription) => {
      if (!subscription.isEnabled) {
        month.disabledCount += 1;
      } else if (subscription.expiryDate < todayStart) {
        month.expiredCount += 1;
      } else {
        month.upcomingCount += 1;
      }

      month.subscriptions.push(subscription);
      return month;
    }, {
      key,
      year: start.getFullYear(),
      month: start.getMonth(),
      startDate: start.getTime(),
      endDate: nextStart.getTime() - DAY_MS,
      subscriptions: [],
      expiredCount: 0,
      disabledCount: 0,
      upcomingCount: 0,
    });
  });
}
