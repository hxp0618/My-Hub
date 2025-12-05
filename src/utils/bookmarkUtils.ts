/**
 * Bookmark utility functions
 * Centralized bookmark tree traversal and manipulation functions
 */

import { EnhancedBookmark } from '@src/types/bookmarks';

/**
 * Recursively flattens a bookmark tree structure into a single array
 * Only includes bookmarks (nodes with URLs), excludes folders
 *
 * @param nodes - Array of bookmark tree nodes
 * @returns Flattened array of bookmarks with URLs
 */
export const flattenBookmarks = (nodes: EnhancedBookmark[]): EnhancedBookmark[] => {
  const flattened: EnhancedBookmark[] = [];

  const traverse = (node: EnhancedBookmark) => {
    // Only add bookmarks with URLs, skip folders
    if (node.url) {
      flattened.push(node);
    }
    // Recursively traverse children
    if (node.children) {
      node.children.forEach(traverse);
    }
  };

  nodes.forEach(traverse);
  return flattened;
};

/**
 * Finds a bookmark or folder by ID in a bookmark tree
 *
 * @param nodes - Array of bookmark tree nodes to search
 * @param id - ID of the bookmark/folder to find
 * @returns Found bookmark/folder node or null if not found
 */
export const findFolder = (nodes: EnhancedBookmark[], id: string): EnhancedBookmark | null => {
  for (const node of nodes) {
    if (node.id === id) return node;
    if (node.children) {
      const found = findFolder(node.children, id);
      if (found) return found;
    }
  }
  return null;
};

/**
 * Finds a folder by title in a Chrome bookmark tree
 *
 * @param nodes - Array of Chrome bookmark tree nodes
 * @param title - Title of the folder to find
 * @returns ID of the found folder or null if not found
 */
export const findFolderIdByTitle = (
  nodes: chrome.bookmarks.BookmarkTreeNode[],
  title: string
): string | null => {
  for (const node of nodes) {
    // Only match folders (nodes without URLs)
    if (!node.url && node.title === title) {
      return node.id;
    }
    if (node.children) {
      const foundId = findFolderIdByTitle(node.children, title);
      if (foundId) return foundId;
    }
  }
  return null;
};

/**
 * Gets favicon URL for a given bookmark URL
 * Uses Google's favicon service
 *
 * @param url - Bookmark URL
 * @returns Favicon URL or default favicon on error
 */
export const getFaviconUrl = (url: string): string => {
  try {
    const urlObj = new URL(url);
    return `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=32`;
  } catch {
    return '/default-favicon.png';
  }
};

/**
 * Simplifies Chrome bookmark tree to only include folders (no bookmarks)
 * Used for displaying folder structure in dropdowns/selects
 *
 * @param nodes - Array of Chrome bookmark tree nodes
 * @returns Simplified tree with only folders and their hierarchy
 */
export const simplifyBookmarkTree = (
  nodes: chrome.bookmarks.BookmarkTreeNode[]
): Array<{ title: string; children?: any[] }> => {
  return nodes
    .filter(node => !node.url) // Only folders
    .map(node => {
      const simplifiedNode: { title: string; children?: any[] } = {
        title: node.title
      };
      if (node.children && node.children.length > 0) {
        const childFolders = simplifyBookmarkTree(node.children);
        if (childFolders.length > 0) {
          simplifiedNode.children = childFolders;
        }
      }
      return simplifiedNode;
    });
};
