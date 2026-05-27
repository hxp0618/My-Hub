import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_MENU_ORDER,
  getValidMenuCustomization,
  getValidMenuOrder,
  isValidMenuCustomization,
  sanitizeMenuCustomization,
} from '../menu';

describe('menu type sanitizers', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('falls back to default order for malformed menu order', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    expect(getValidMenuOrder(['home', 'home', 'tools'])).toEqual(DEFAULT_MENU_ORDER);
    expect(getValidMenuOrder(['history', 'tools'])).toEqual(DEFAULT_MENU_ORDER);
  });

  it('keeps valid menu customization entries while dropping damaged ones', () => {
    expect(sanitizeMenuCustomization({
      home: { customIcon: ' star ' },
      bookmarks: { customIcon: '' },
      history: { customIcon: 42 },
      tools: {},
      unknown: { customIcon: 'settings' },
      tags: null,
    })).toEqual({
      home: { customIcon: 'star' },
      tools: {},
    });
  });

  it('returns a partially sanitized customization instead of clearing everything', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    expect(getValidMenuCustomization({
      subscriptions: { customIcon: ' rss_feed ' },
      badItem: { customIcon: 'warning' },
    })).toEqual({
      subscriptions: { customIcon: 'rss_feed' },
    });
  });

  it('strictly validates complete menu customization payloads', () => {
    expect(isValidMenuCustomization({
      home: { customIcon: 'home' },
      bookmarks: {},
    })).toBe(true);

    expect(isValidMenuCustomization({
      home: { customIcon: '   ' },
    })).toBe(false);
    expect(isValidMenuCustomization({
      notAMenuItem: { customIcon: 'home' },
    })).toBe(false);
  });
});
