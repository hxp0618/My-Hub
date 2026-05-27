import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_NOTIFICATION_CONFIG,
  DEFAULT_SUBSCRIPTION_SETTINGS,
  EXPORT_DATA_VERSION,
  SubscriptionExportData,
} from '../../types/subscription';
import * as indexedDB from '../../db/indexedDB';
import { subscriptionConfigExporter, validateImportData } from '../SubscriptionConfigExporter';

vi.mock('../../db/indexedDB', () => ({
  getAllSubscriptions: vi.fn(async () => []),
  clearAllSubscriptions: vi.fn(async () => undefined),
  batchAddSubscriptions: vi.fn(async () => undefined),
  getSubscriptionSettings: vi.fn(async () => DEFAULT_SUBSCRIPTION_SETTINGS),
  setSubscriptionSettings: vi.fn(async () => undefined),
  getSubscriptionNotificationConfig: vi.fn(async () => DEFAULT_NOTIFICATION_CONFIG),
  setSubscriptionNotificationConfig: vi.fn(async () => undefined),
}));

const validExportData: SubscriptionExportData = {
  version: EXPORT_DATA_VERSION,
  exportedAt: new Date(2026, 4, 25).getTime(),
  subscriptions: [
    {
      id: 'sub_1',
      name: 'Example Pro',
      type: 'software',
      cycle: 'annual',
      expiryDate: new Date(2027, 4, 25).getTime(),
      reminderDays: 7,
      notificationChannels: ['email'],
      status: 'active',
      isEnabled: true,
      createdAt: new Date(2026, 4, 25).getTime(),
      updatedAt: new Date(2026, 4, 25).getTime(),
    },
  ],
  notificationConfig: DEFAULT_NOTIFICATION_CONFIG,
  settings: DEFAULT_SUBSCRIPTION_SETTINGS,
};

describe('subscription config import validation', () => {
  beforeEach(() => {
    vi.mocked(indexedDB.getAllSubscriptions).mockResolvedValue([]);
    vi.mocked(indexedDB.clearAllSubscriptions).mockResolvedValue(undefined);
    vi.mocked(indexedDB.batchAddSubscriptions).mockResolvedValue(undefined);
    vi.mocked(indexedDB.getSubscriptionSettings).mockResolvedValue(DEFAULT_SUBSCRIPTION_SETTINGS);
    vi.mocked(indexedDB.setSubscriptionSettings).mockResolvedValue(undefined);
    vi.mocked(indexedDB.getSubscriptionNotificationConfig).mockResolvedValue(DEFAULT_NOTIFICATION_CONFIG);
    vi.mocked(indexedDB.setSubscriptionNotificationConfig).mockResolvedValue(undefined);
  });

  it('accepts valid backup data', () => {
    const result = validateImportData(JSON.stringify(validExportData));

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.issues).toEqual([]);
    expect(result.data?.subscriptions).toHaveLength(1);
  });

  it('rejects invalid JSON without throwing', () => {
    const result = validateImportData('{oops');

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(['无效的 JSON 格式']);
    expect(result.issues).toEqual([{ code: 'invalidJson' }]);
  });

  it('reports invalid subscription fields', () => {
    const invalidData = {
      ...validExportData,
      subscriptions: [
        {
          ...validExportData.subscriptions[0],
          name: '',
          cycle: 'weekly',
          status: 'pending',
          notificationChannels: ['email', 'sms'],
          createdAt: 'yesterday',
          updatedAt: Number.POSITIVE_INFINITY,
          notes: 42,
        },
      ],
    };

    const result = validateImportData(JSON.stringify(invalidData));

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('订阅 #1: 名称不能为空');
    expect(result.errors).toContain('订阅 #1: 无效的订阅周期 "weekly"');
    expect(result.issues).toEqual(expect.arrayContaining([
      { code: 'subscriptionNameRequired', values: { number: 1 } },
      { code: 'invalidSubscriptionCycle', values: { number: 1, value: 'weekly' } },
      { code: 'invalidSubscriptionStatus', values: { number: 1, value: 'pending' } },
      { code: 'invalidNotificationChannels', values: { number: 1 } },
      { code: 'invalidCreatedAt', values: { number: 1 } },
      { code: 'invalidUpdatedAt', values: { number: 1 } },
      { code: 'invalidOptionalText', values: { number: 1 } },
    ]));
  });

  it('reports invalid reminder settings fields', () => {
    const result = validateImportData(JSON.stringify({
      ...validExportData,
      settings: {
        showLunarDate: true,
        defaultReminderDays: Number.NaN,
        dailyReminder: 'yes',
        pageSize: 0,
      },
    }));

    expect(result.valid).toBe(false);
    expect(result.issues).toEqual(expect.arrayContaining([
      { code: 'invalidDefaultReminderDays' },
      { code: 'invalidDailyReminder' },
      { code: 'invalidPageSize' },
    ]));
  });

  it('rejects unsupported imported subscription page sizes', () => {
    const result = validateImportData(JSON.stringify({
      ...validExportData,
      settings: {
        ...DEFAULT_SUBSCRIPTION_SETTINGS,
        pageSize: 25,
      },
    }));

    expect(result.valid).toBe(false);
    expect(result.issues).toContainEqual({ code: 'invalidPageSize' });
  });

  it('reports a structured issue when subscription data is missing', () => {
    const result = validateImportData(JSON.stringify({
      ...validExportData,
      subscriptions: undefined,
    }));

    expect(result.valid).toBe(false);
    expect(result.issues).toContainEqual({ code: 'missingSubscriptions' });
  });

  it('returns a stable import issue when storage fails during import', async () => {
    vi.mocked(indexedDB.batchAddSubscriptions).mockRejectedValue(new Error('raw indexeddb quota exceeded'));

    const result = await subscriptionConfigExporter.importConfig(JSON.stringify(validExportData), 'overwrite');

    expect(result.success).toBe(false);
    expect(result.errors).toEqual(['导入失败']);
    expect(result.issues).toEqual([{ code: 'importFailed' }]);
    expect(result.errors.join(' ')).not.toContain('raw indexeddb quota exceeded');
  });
});
