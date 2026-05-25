import { describe, expect, it } from 'vitest';
import {
  analyzeBookmarkHealth,
  bookmarkMatchesHealthIssue,
  getDuplicateBookmarkUrls,
} from '../bookmarkHealth';
import type { EnhancedBookmark } from '../../types/bookmarks';

const bookmark = (overrides: Partial<EnhancedBookmark>): EnhancedBookmark => ({
  id: overrides.id ?? '1',
  title: overrides.title ?? 'Example',
  url: overrides.url ?? 'https://example.com',
  tags: overrides.tags ?? ['reference'],
  dateLastUsed: overrides.dateLastUsed,
  syncing: false,
  ...overrides,
});

describe('analyzeBookmarkHealth', () => {
  const now = new Date('2026-05-25T00:00:00Z').getTime();

  it('counts duplicate, untagged, stale, and invalid bookmarks', () => {
    const report = analyzeBookmarkHealth([
      bookmark({ id: '1', url: 'https://example.com', dateLastUsed: now }),
      bookmark({ id: '2', url: 'https://example.com', tags: [], dateLastUsed: now }),
      bookmark({ id: '3', url: 'chrome://settings', tags: ['system'], dateLastUsed: now }),
      bookmark({ id: '4', url: 'https://old.example.com', dateLastUsed: now - 220 * 24 * 60 * 60 * 1000 }),
    ], now);

    expect(report).toMatchObject({
      total: 4,
      duplicateGroups: 1,
      duplicateItems: 1,
      untagged: 1,
      stale: 1,
      invalidUrls: 1,
    });
    expect(report.score).toBeLessThan(100);
  });

  it('treats empty bookmark trees as healthy', () => {
    expect(analyzeBookmarkHealth([], now)).toEqual({
      total: 0,
      duplicateGroups: 0,
      duplicateItems: 0,
      untagged: 0,
      stale: 0,
      invalidUrls: 0,
      score: 100,
    });
  });

  it('matches bookmarks by health issue type', () => {
    const bookmarks = [
      bookmark({ id: '1', url: 'https://example.com', dateLastUsed: now }),
      bookmark({ id: '2', url: 'https://example.com', tags: [], dateLastUsed: now }),
      bookmark({ id: '3', url: 'chrome://settings', dateLastUsed: now }),
      bookmark({ id: '4', url: 'https://old.example.com', dateLastUsed: now - 220 * 24 * 60 * 60 * 1000 }),
    ];
    const duplicateUrls = getDuplicateBookmarkUrls(bookmarks);

    expect(bookmarkMatchesHealthIssue(bookmarks[0], 'duplicates', duplicateUrls, now)).toBe(true);
    expect(bookmarkMatchesHealthIssue(bookmarks[1], 'untagged', duplicateUrls, now)).toBe(true);
    expect(bookmarkMatchesHealthIssue(bookmarks[2], 'invalid', duplicateUrls, now)).toBe(true);
    expect(bookmarkMatchesHealthIssue(bookmarks[3], 'stale', duplicateUrls, now)).toBe(true);
  });
});
