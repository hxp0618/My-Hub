import { describe, expect, it } from 'vitest';
import {
  formatDateInputValue,
  getDefaultDateInputValue,
  parseDateInputValue,
} from '../dateInput';

describe('date input utilities', () => {
  it('formats timestamps with local calendar parts instead of ISO UTC parts', () => {
    const timestamp = new Date(2026, 4, 25, 23, 30, 0, 0).getTime();

    expect(formatDateInputValue(timestamp)).toBe('2026-05-25');
  });

  it('parses date input values as local midnight', () => {
    const timestamp = parseDateInputValue('2026-05-25');

    expect(timestamp).toBe(new Date(2026, 4, 25, 0, 0, 0, 0).getTime());
  });

  it('rejects invalid date input values', () => {
    expect(parseDateInputValue('2026-02-31')).toBeNull();
    expect(parseDateInputValue('2026-5-25')).toBeNull();
    expect(parseDateInputValue('not-a-date')).toBeNull();
  });

  it('builds default date values from the local calendar year', () => {
    const baseDate = new Date(2026, 4, 25, 10, 0, 0, 0);

    expect(getDefaultDateInputValue(1, baseDate)).toBe('2027-05-25');
  });
});
