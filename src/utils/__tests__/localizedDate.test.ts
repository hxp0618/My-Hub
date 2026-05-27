import { afterEach, describe, expect, it } from 'vitest';
import { formatLocalizedDate, getPreferredLocale } from '../localizedDate';
import { StorageKey } from '../storageManager';

describe('formatLocalizedDate', () => {
  afterEach(() => {
    localStorage.clear();
  });

  const timestamp = new Date(2026, 4, 25, 0, 0, 0, 0).getTime();

  it('formats dates with an explicit Chinese locale', () => {
    expect(formatLocalizedDate(timestamp, 'zh-CN')).toContain('2026');
    expect(formatLocalizedDate(timestamp, 'zh-CN')).toContain('5月');
  });

  it('formats dates with an explicit English locale', () => {
    expect(formatLocalizedDate(timestamp, 'en-US')).toContain('May');
    expect(formatLocalizedDate(timestamp, 'en-US')).toContain('2026');
  });

  it('uses saved supported language and ignores invalid saved language', () => {
    localStorage.setItem(StorageKey.LANGUAGE, 'zh-CN');
    expect(getPreferredLocale()).toBe('zh-CN');

    localStorage.setItem(StorageKey.LANGUAGE, 'fr');
    expect(getPreferredLocale()).not.toBe('fr');
  });
});
