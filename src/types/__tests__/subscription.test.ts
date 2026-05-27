import { describe, expect, it } from 'vitest';
import {
  DEFAULT_PAGE_SIZE,
  isPageSizeOption,
  parsePageSizeOption,
} from '../subscription';

describe('subscription settings helpers', () => {
  it('recognizes only supported page size options', () => {
    expect(isPageSizeOption(10)).toBe(true);
    expect(isPageSizeOption(100)).toBe(true);
    expect(isPageSizeOption(25)).toBe(false);
    expect(isPageSizeOption('20')).toBe(false);
  });

  it('strictly parses page size values with a safe fallback', () => {
    expect(parsePageSizeOption('20')).toBe(20);
    expect(parsePageSizeOption(' 50 ')).toBe(50);
    expect(parsePageSizeOption(100)).toBe(100);
    expect(parsePageSizeOption('20abc', 10)).toBe(10);
    expect(parsePageSizeOption('25', 50)).toBe(50);
    expect(parsePageSizeOption(Number.NaN, 100)).toBe(100);
    expect(parsePageSizeOption(undefined)).toBe(DEFAULT_PAGE_SIZE);
  });
});
