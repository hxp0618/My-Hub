import { afterEach, describe, expect, it } from 'vitest';
import {
  getSortOrderFromStorage,
  isBookmarkSortOrderValue,
} from '../useBookmarks';

describe('bookmark sort order storage', () => {
  afterEach(() => {
    localStorage.clear();
  });

  it('accepts only supported sort order values', () => {
    expect(isBookmarkSortOrderValue({ key: 'title', order: 'asc' })).toBe(true);
    expect(isBookmarkSortOrderValue({ key: 'dateLastUsed', order: 'desc' })).toBe(true);

    expect(isBookmarkSortOrderValue({ key: 'url', order: 'asc' })).toBe(false);
    expect(isBookmarkSortOrderValue({ key: 'title', order: 'sideways' })).toBe(false);
    expect(isBookmarkSortOrderValue(null)).toBe(false);
    expect(isBookmarkSortOrderValue([])).toBe(false);
  });

  it('falls back when stored sort order is malformed', () => {
    localStorage.setItem('bookmark_sort_order', '{bad-json');
    expect(getSortOrderFromStorage()).toEqual({ key: 'dateAdded', order: 'desc' });

    localStorage.setItem('bookmark_sort_order', JSON.stringify({ key: 'url', order: 'asc' }));
    expect(getSortOrderFromStorage()).toEqual({ key: 'dateAdded', order: 'desc' });
  });

  it('restores a valid saved sort order', () => {
    localStorage.setItem('bookmark_sort_order', JSON.stringify({ key: 'title', order: 'asc' }));

    expect(getSortOrderFromStorage()).toEqual({ key: 'title', order: 'asc' });
  });
});
