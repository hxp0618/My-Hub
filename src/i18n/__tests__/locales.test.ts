import { describe, expect, it } from 'vitest';
import zhCN from '../locales/zh-CN.json';
import en from '../locales/en.json';

const flattenLocaleKeys = (value: unknown, prefix = ''): string[] => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return prefix ? [prefix] : [];
  }

  return Object.entries(value).flatMap(([key, child]) => {
    const nextPrefix = prefix ? `${prefix}.${key}` : key;
    return flattenLocaleKeys(child, nextPrefix);
  });
};

describe('i18n locales', () => {
  it('keeps Simplified Chinese and English locale keys aligned', () => {
    const zhKeys = flattenLocaleKeys(zhCN).sort();
    const enKeys = flattenLocaleKeys(en).sort();

    expect(enKeys.filter((key) => !zhKeys.includes(key))).toEqual([]);
    expect(zhKeys.filter((key) => !enKeys.includes(key))).toEqual([]);
    expect(enKeys).toEqual(zhKeys);
  });
});
