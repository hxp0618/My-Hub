import { describe, expect, it } from 'vitest';
import {
  DEFAULT_NOTIFICATION_CONFIG,
  DEFAULT_SUBSCRIPTION_SETTINGS,
  EXPORT_DATA_VERSION,
  SubscriptionExportData,
} from '../../types/subscription';
import { validateImportData } from '../SubscriptionConfigExporter';

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
    ]));
  });

  it('reports a structured issue when subscription data is missing', () => {
    const result = validateImportData(JSON.stringify({
      ...validExportData,
      subscriptions: undefined,
    }));

    expect(result.valid).toBe(false);
    expect(result.issues).toContainEqual({ code: 'missingSubscriptions' });
  });
});
