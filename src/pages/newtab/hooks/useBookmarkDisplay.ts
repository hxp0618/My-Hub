import { useMemo } from 'react';
import { EnhancedBookmark } from '@src/types/bookmarks';
import { SortOrder } from '../types';
import { findFolder, flattenBookmarks } from '@src/utils/bookmarkUtils';
import {
  analyzeBookmarkHealth,
  bookmarkMatchesHealthIssue,
  BookmarkHealthIssue,
  getDuplicateBookmarkUrls,
} from '@src/utils/bookmarkHealth';

const sortBookmarks = (bookmarks: EnhancedBookmark[], sortOrder: SortOrder) => {
  return [...bookmarks].sort((a, b) => {
    const aVal = a[sortOrder.key] || 0;
    const bVal = b[sortOrder.key] || 0;

    if (aVal < bVal) {
      return sortOrder.order === 'asc' ? -1 : 1;
    }
    if (aVal > bVal) {
      return sortOrder.order === 'asc' ? 1 : -1;
    }
    return 0;
  });
};

export const useBookmarkDisplay = ({
  bookmarks,
  selectedFolderId,
  searchTerm,
  activeHealthIssue,
  sortOrder,
}: {
  bookmarks: EnhancedBookmark[];
  selectedFolderId: string;
  searchTerm: string;
  activeHealthIssue: BookmarkHealthIssue | null;
  sortOrder: SortOrder;
}) => {
  const selectedFolder = useMemo(
    () => findFolder(bookmarks, selectedFolderId),
    [bookmarks, selectedFolderId],
  );

  const allBookmarksFlat = useMemo(() => flattenBookmarks(bookmarks), [bookmarks]);
  const duplicateBookmarkUrls = useMemo(
    () => getDuplicateBookmarkUrls(allBookmarksFlat),
    [allBookmarksFlat],
  );
  const healthReport = useMemo(() => analyzeBookmarkHealth(bookmarks), [bookmarks]);

  const searchResults = useMemo(() => {
    if (!searchTerm) return [];

    const term = searchTerm.toLowerCase();
    return allBookmarksFlat.filter(
      item =>
        item.title.toLowerCase().includes(term) ||
        (item.url && item.url.toLowerCase().includes(term)) ||
        (item.tags && item.tags.some(tag => tag.toLowerCase().includes(term)))
    );
  }, [allBookmarksFlat, searchTerm]);

  const healthFilteredBookmarks = useMemo(() => {
    if (!activeHealthIssue) return [];

    return allBookmarksFlat.filter(item =>
      bookmarkMatchesHealthIssue(item, activeHealthIssue, duplicateBookmarkUrls)
    );
  }, [activeHealthIssue, allBookmarksFlat, duplicateBookmarkUrls]);

  const bookmarksToDisplay = useMemo(() => {
    if (activeHealthIssue) {
      return sortBookmarks(healthFilteredBookmarks, sortOrder);
    }

    if (searchTerm) {
      return searchResults;
    }

    if (!selectedFolder) {
      return [];
    }

    return sortBookmarks(flattenBookmarks(selectedFolder.children || []), sortOrder);
  }, [activeHealthIssue, healthFilteredBookmarks, searchResults, searchTerm, selectedFolder, sortOrder]);

  return {
    selectedFolder,
    allBookmarksFlat,
    duplicateBookmarkUrls,
    healthReport,
    searchResults,
    healthFilteredBookmarks,
    bookmarksToDisplay,
  };
};
