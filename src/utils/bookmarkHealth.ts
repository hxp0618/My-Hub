import { EnhancedBookmark } from '../types/bookmarks';
import { flattenBookmarks } from './bookmarkUtils';

const STALE_BOOKMARK_DAYS = 180;
const DAY_IN_MS = 24 * 60 * 60 * 1000;

export type BookmarkHealthIssue = 'duplicates' | 'untagged' | 'stale' | 'invalid';

export interface BookmarkHealthReport {
  total: number;
  duplicateGroups: number;
  duplicateItems: number;
  untagged: number;
  stale: number;
  invalidUrls: number;
  score: number;
}

const isValidHttpUrl = (url: string) => {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
};

const isStaleBookmark = (bookmark: EnhancedBookmark, now = Date.now()) => {
  const staleThreshold = now - STALE_BOOKMARK_DAYS * DAY_IN_MS;
  return !bookmark.dateLastUsed || bookmark.dateLastUsed < staleThreshold;
};

export const getDuplicateBookmarkUrls = (bookmarks: EnhancedBookmark[]): Set<string> => {
  const urlCounts = new Map<string, number>();
  bookmarks.forEach(bookmark => {
    if (bookmark.url) {
      urlCounts.set(bookmark.url, (urlCounts.get(bookmark.url) ?? 0) + 1);
    }
  });

  return new Set(
    Array.from(urlCounts.entries())
      .filter(([, count]) => count > 1)
      .map(([url]) => url),
  );
};

export const bookmarkMatchesHealthIssue = (
  bookmark: EnhancedBookmark,
  issue: BookmarkHealthIssue,
  duplicateUrls: Set<string>,
  now = Date.now(),
): boolean => {
  if (!bookmark.url) return false;

  switch (issue) {
    case 'duplicates':
      return duplicateUrls.has(bookmark.url);
    case 'untagged':
      return !bookmark.tags || bookmark.tags.length === 0;
    case 'stale':
      return isStaleBookmark(bookmark, now);
    case 'invalid':
      return !isValidHttpUrl(bookmark.url);
  }
};

export const analyzeBookmarkHealth = (
  nodes: EnhancedBookmark[],
  now = Date.now(),
): BookmarkHealthReport => {
  const bookmarks = flattenBookmarks(nodes);
  const duplicateUrls = getDuplicateBookmarkUrls(bookmarks);

  let untagged = 0;
  let stale = 0;
  let invalidUrls = 0;

  for (const bookmark of bookmarks) {
    if (!bookmark.url) continue;

    if (!bookmark.tags || bookmark.tags.length === 0) {
      untagged += 1;
    }

    if (!isValidHttpUrl(bookmark.url)) {
      invalidUrls += 1;
    }

    // 没有历史记录的书签也提示为可回顾，避免长期沉默的收藏被遗漏。
    if (isStaleBookmark(bookmark, now)) {
      stale += 1;
    }
  }

  const duplicateGroups = duplicateUrls.size;
  const duplicateItems = bookmarks.filter(bookmark => bookmark.url && duplicateUrls.has(bookmark.url)).length - duplicateGroups;

  const totalIssues = duplicateItems + untagged + stale + invalidUrls;
  const total = bookmarks.length;
  const score = total === 0
    ? 100
    : Math.max(0, Math.round(100 - (totalIssues / total) * 25));

  return {
    total,
    duplicateGroups,
    duplicateItems,
    untagged,
    stale,
    invalidUrls,
    score,
  };
};
