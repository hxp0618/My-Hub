/**
 * Storage Manager - Centralized localStorage management
 * Provides type-safe, error-handled access to all localStorage keys
 */

import { createLogger } from './logger';
import { ToolConfig, ToolId } from '../types/tools';

const logger = createLogger('[StorageManager]');

/**
 * Storage keys enum for type safety
 */
export enum StorageKey {
  // LLM Settings
  LLM_SETTINGS = 'llm_settings',

  // Bookmark Settings
  BOOKMARK_SORT_ORDER = 'bookmark_sort_order',
  BOOKMARK_SIDEBAR_COLLAPSED = 'bookmark-sidebar-collapsed',
  AUTO_SUGGEST_BOOKMARK = 'autoSuggestBookmarkInfo',

  // Home Page Settings
  WEB_COMBOS = 'webCombos',
  NO_MORE_DISPLAYED = 'noMoreDisplayed',

  // i18n
  LANGUAGE = 'i18nextLng',

  // Theme
  THEME = 'theme',

  // Tools Configuration
  TOOLS_CONFIG = 'tools_config',
}

/**
 * Type definitions for storage values
 */
export type StorageValues = {
  [StorageKey.LLM_SETTINGS]: {
    selectedProvider?: string;
    apiKey?: string;
    customApiUrl?: string;
    selectedModel?: string;
    customModel?: string;
    prioritizeGeminiNano?: boolean;
  };
  [StorageKey.BOOKMARK_SORT_ORDER]: 'recent' | 'alphabetical';
  [StorageKey.BOOKMARK_SIDEBAR_COLLAPSED]: boolean;
  [StorageKey.AUTO_SUGGEST_BOOKMARK]: boolean;
  [StorageKey.WEB_COMBOS]: Array<{ url: string; title: string }>;
  [StorageKey.NO_MORE_DISPLAYED]: string[];
  [StorageKey.LANGUAGE]: string;
  [StorageKey.THEME]: 'light' | 'dark' | 'system';
  [StorageKey.TOOLS_CONFIG]: ToolConfig;
};

/**
 * Generic storage manager class
 */
class StorageManager {
  /**
   * Get item from localStorage with type safety
   */
  get<K extends StorageKey>(
    key: K,
    defaultValue: StorageValues[K]
  ): StorageValues[K] {
    try {
      const item = localStorage.getItem(key);
      if (item === null) {
        return defaultValue;
      }

      // Handle boolean values
      if (typeof defaultValue === 'boolean') {
        return JSON.parse(item) as StorageValues[K];
      }

      // Handle string values
      if (typeof defaultValue === 'string') {
        return item as StorageValues[K];
      }

      // Handle object/array values
      return JSON.parse(item) as StorageValues[K];
    } catch (error) {
      logger.error(`Error reading ${key} from localStorage:`, error);
      return defaultValue;
    }
  }

  /**
   * Set item in localStorage with type safety
   */
  set<K extends StorageKey>(key: K, value: StorageValues[K]): void {
    try {
      if (typeof value === 'string') {
        localStorage.setItem(key, value);
      } else {
        localStorage.setItem(key, JSON.stringify(value));
      }
    } catch (error) {
      logger.error(`Error saving ${key} to localStorage:`, error);
    }
  }

  /**
   * Remove item from localStorage
   */
  remove(key: StorageKey): void {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      logger.error(`Error removing ${key} from localStorage:`, error);
    }
  }

  /**
   * Clear all items from localStorage
   */
  clear(): void {
    try {
      localStorage.clear();
    } catch (error) {
      logger.error('Error clearing localStorage:', error);
    }
  }

  /**
   * Get folder expansion state
   * Dynamic key for different folders
   */
  getFolderState(folderId: string): boolean {
    try {
      const key = `bookmark-folder-state-${folderId}`;
      const stored = localStorage.getItem(key);
      return stored !== null ? stored === 'true' : true; // Default expanded
    } catch (error) {
      logger.error(`Error reading folder state for ${folderId}:`, error);
      return true;
    }
  }

  /**
   * Set folder expansion state
   */
  setFolderState(folderId: string, expanded: boolean): void {
    try {
      const key = `bookmark-folder-state-${folderId}`;
      localStorage.setItem(key, String(expanded));
    } catch (error) {
      logger.error(`Error saving folder state for ${folderId}:`, error);
    }
  }
}

/**
 * Singleton instance
 */
export const storage = new StorageManager();

/**
 * Convenience functions for common operations
 */

// LLM Settings
export const llmSettings = {
  get: () => storage.get(StorageKey.LLM_SETTINGS, {}),
  set: (value: StorageValues[StorageKey.LLM_SETTINGS]) =>
    storage.set(StorageKey.LLM_SETTINGS, value),
};

// Bookmark Sort Order
export const bookmarkSortOrder = {
  get: () => storage.get(StorageKey.BOOKMARK_SORT_ORDER, 'recent'),
  set: (value: StorageValues[StorageKey.BOOKMARK_SORT_ORDER]) =>
    storage.set(StorageKey.BOOKMARK_SORT_ORDER, value),
};

// Bookmark Sidebar Collapsed
export const bookmarkSidebarCollapsed = {
  get: () => storage.get(StorageKey.BOOKMARK_SIDEBAR_COLLAPSED, false),
  set: (value: boolean) => storage.set(StorageKey.BOOKMARK_SIDEBAR_COLLAPSED, value),
};

// Auto Suggest Bookmark
export const autoSuggestBookmark = {
  get: () => storage.get(StorageKey.AUTO_SUGGEST_BOOKMARK, false),
  set: (value: boolean) => storage.set(StorageKey.AUTO_SUGGEST_BOOKMARK, value),
};

// Web Combos
export const webCombos = {
  get: () => storage.get(StorageKey.WEB_COMBOS, []),
  set: (value: StorageValues[StorageKey.WEB_COMBOS]) =>
    storage.set(StorageKey.WEB_COMBOS, value),
};

// No More Displayed
export const noMoreDisplayed = {
  get: () => storage.get(StorageKey.NO_MORE_DISPLAYED, []),
  set: (value: string[]) => storage.set(StorageKey.NO_MORE_DISPLAYED, value),
};

// Language
export const language = {
  get: () => storage.get(StorageKey.LANGUAGE, 'zh-CN'),
  set: (value: string) => storage.set(StorageKey.LANGUAGE, value),
};

// Theme
export const theme = {
  get: () => storage.get(StorageKey.THEME, 'system'),
  set: (value: StorageValues[StorageKey.THEME]) => storage.set(StorageKey.THEME, value),
};

// Folder State
export const folderState = {
  get: (folderId: string) => storage.getFolderState(folderId),
  set: (folderId: string, expanded: boolean) => storage.setFolderState(folderId, expanded),
};

// Tools Configuration
export const toolsConfig = {
  get: () =>
    storage.get(StorageKey.TOOLS_CONFIG, {
      enabledTools: Object.values(ToolId), // Default: all tools enabled
    }),
  set: (value: ToolConfig) => storage.set(StorageKey.TOOLS_CONFIG, value),
};
