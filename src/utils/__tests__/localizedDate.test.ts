import { describe, expect, it } from 'vitest';
import { formatLocalizedDate } from '../localizedDate';

describe('formatLocalizedDate', () => {
  const timestamp = new Date(2026, 4, 25, 0, 0, 0, 0).getTime();

  it('formats dates with an explicit Chinese locale', () => {
    expect(formatLocalizedDate(timestamp, 'zh-CN')).toContain('2026');
    expect(formatLocalizedDate(timestamp, 'zh-CN')).toContain('5月');
  });

  it('formats dates with an explicit English locale', () => {
    expect(formatLocalizedDate(timestamp, 'en-US')).toContain('May');
    expect(formatLocalizedDate(timestamp, 'en-US')).toContain('2026');
  });
});
