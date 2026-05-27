/**
 * Storage Manager - Centralized localStorage management
 * Provides type-safe, error-handled access to all localStorage keys
 */

import { createLogger } from './logger';
import { DEFAULT_TOOL_CONFIG, ToolConfig, sanitizeToolConfig } from '../types/tools';

const logger = createLogger('[StorageManager]');
const FOLDER_STATE_PREFIX = 'bookmark-folder-state-';
const LEGACY_FOLDER_STATE_PREFIX = 'folder-expanded-';

export const DEFAULT_SIDEBAR_WIDTH = 256;
export const MIN_SIDEBAR_WIDTH = 200;
export const MAX_SIDEBAR_WIDTH = 400;
export const SUPPORTED_LANGUAGES = ['zh-CN', 'en'] as const;
export type SupportedLanguage = typeof SUPPORTED_LANGUAGES[number];
export const SUPPORTED_THEMES = ['light', 'dark', 'system', 'eye-care'] as const;
export type SupportedTheme = typeof SUPPORTED_THEMES[number];
export const STORAGE_MANAGER_ERROR_CODES = ['unsupportedStorageKey'] as const;
export type StorageManagerErrorCode = typeof STORAGE_MANAGER_ERROR_CODES[number];

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
  CARDS_PER_ROW = 'cardsPerRow',
  HOME_ITEM_ORDER = 'homeItemOrder',
  SIDEBAR_WIDTH = 'sidebarWidth',

  // i18n
  LANGUAGE = 'language',

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
  [StorageKey.WEB_COMBOS]: Array<{ id: string; title: string; urls: string[] }>;
  [StorageKey.NO_MORE_DISPLAYED]: string[];
  [StorageKey.CARDS_PER_ROW]: 2 | 3 | 4 | 5 | 6;
  [StorageKey.HOME_ITEM_ORDER]: string[];
  [StorageKey.SIDEBAR_WIDTH]: number;
  [StorageKey.LANGUAGE]: SupportedLanguage;
  [StorageKey.THEME]: SupportedTheme;
  [StorageKey.TOOLS_CONFIG]: ToolConfig;
};

const isRecord = (value: unknown): value is Record<string, unknown> => (
  !!value && typeof value === 'object' && !Array.isArray(value)
);

export const isStringArrayValue = (value: unknown): value is string[] => (
  Array.isArray(value) && value.every(item => typeof item === 'string')
);

export const sanitizeStringArrayValue = (value: unknown, fallback: string[]): string[] => (
  isStringArrayValue(value) ? value : fallback
);

export const isCardsPerRowValue = (value: unknown): value is StorageValues[StorageKey.CARDS_PER_ROW] => (
  value === 2 || value === 3 || value === 4 || value === 5 || value === 6
);

export const parseCardsPerRowValue = (
  value: unknown
): StorageValues[StorageKey.CARDS_PER_ROW] | null => {
  if (typeof value === 'string') {
    const trimmedValue = value.trim();
    if (!/^\d+$/.test(trimmedValue)) return null;
    const parsedValue = Number(trimmedValue);
    return isCardsPerRowValue(parsedValue) ? parsedValue : null;
  }

  return isCardsPerRowValue(value) ? value : null;
};

export const sanitizeCardsPerRow = (
  value: unknown,
  fallback: StorageValues[StorageKey.CARDS_PER_ROW]
) => parseCardsPerRowValue(value) ?? fallback;

export const isSidebarWidthValue = (value: unknown): value is StorageValues[StorageKey.SIDEBAR_WIDTH] => (
  typeof value === 'number' &&
  Number.isInteger(value) &&
  value >= MIN_SIDEBAR_WIDTH &&
  value <= MAX_SIDEBAR_WIDTH
);

const sanitizeSidebarWidth = (value: unknown, fallback: StorageValues[StorageKey.SIDEBAR_WIDTH]) => (
  isSidebarWidthValue(value) ? value : fallback
);

export const isLanguageValue = (value: unknown): value is SupportedLanguage => (
  typeof value === 'string' && SUPPORTED_LANGUAGES.includes(value as SupportedLanguage)
);

export const isThemeValue = (value: unknown): value is SupportedTheme => (
  typeof value === 'string' && SUPPORTED_THEMES.includes(value as SupportedTheme)
);

export const sanitizeWebCombosValue = (
  value: unknown,
  fallback: StorageValues[StorageKey.WEB_COMBOS],
): StorageValues[StorageKey.WEB_COMBOS] => {
  if (!Array.isArray(value)) return fallback;

  return value.filter((item): item is StorageValues[StorageKey.WEB_COMBOS][number] => (
    isRecord(item) &&
    typeof item.id === 'string' &&
    typeof item.title === 'string' &&
    isStringArrayValue(item.urls)
  ));
};

const sanitizeLlmSettings = (
  value: unknown,
  fallback: StorageValues[StorageKey.LLM_SETTINGS],
): StorageValues[StorageKey.LLM_SETTINGS] => {
  if (!isRecord(value)) return fallback;

  const result: StorageValues[StorageKey.LLM_SETTINGS] = {};
  if (typeof value.selectedProvider === 'string') result.selectedProvider = value.selectedProvider;
  if (typeof value.apiKey === 'string') result.apiKey = value.apiKey;
  if (typeof value.customApiUrl === 'string') result.customApiUrl = value.customApiUrl;
  if (typeof value.selectedModel === 'string') result.selectedModel = value.selectedModel;
  if (typeof value.customModel === 'string') result.customModel = value.customModel;
  if (typeof value.prioritizeGeminiNano === 'boolean') result.prioritizeGeminiNano = value.prioritizeGeminiNano;
  return result;
};

const readBooleanStorageValue = (key: string): boolean | null => {
  const stored = localStorage.getItem(key);
  if (stored === 'true') return true;
  if (stored === 'false') return false;
  return null;
};

const getDefaultValue = <K extends StorageKey>(key: K): StorageValues[K] => {
  switch (key) {
    case StorageKey.LLM_SETTINGS:
      return {} as StorageValues[K];
    case StorageKey.BOOKMARK_SORT_ORDER:
      return 'recent' as StorageValues[K];
    case StorageKey.BOOKMARK_SIDEBAR_COLLAPSED:
    case StorageKey.AUTO_SUGGEST_BOOKMARK:
      return false as StorageValues[K];
    case StorageKey.WEB_COMBOS:
    case StorageKey.NO_MORE_DISPLAYED:
    case StorageKey.HOME_ITEM_ORDER:
      return [] as unknown as StorageValues[K];
    case StorageKey.CARDS_PER_ROW:
      return 4 as StorageValues[K];
    case StorageKey.SIDEBAR_WIDTH:
      return DEFAULT_SIDEBAR_WIDTH as StorageValues[K];
    case StorageKey.LANGUAGE:
      return 'zh-CN' as StorageValues[K];
    case StorageKey.THEME:
      return 'system' as StorageValues[K];
    case StorageKey.TOOLS_CONFIG:
      return DEFAULT_TOOL_CONFIG as StorageValues[K];
    default:
      throw new Error('unsupportedStorageKey');
  }
};

/**
 * Generic storage manager class
 */
class StorageManager {
  private normalize<K extends StorageKey>(
    key: K,
    value: unknown,
    defaultValue: StorageValues[K]
  ): StorageValues[K] {
    switch (key) {
      case StorageKey.LLM_SETTINGS:
        return sanitizeLlmSettings(value, defaultValue as StorageValues[StorageKey.LLM_SETTINGS]) as StorageValues[K];
      case StorageKey.BOOKMARK_SORT_ORDER:
        return (value === 'recent' || value === 'alphabetical' ? value : defaultValue) as StorageValues[K];
      case StorageKey.BOOKMARK_SIDEBAR_COLLAPSED:
      case StorageKey.AUTO_SUGGEST_BOOKMARK:
        return (typeof value === 'boolean' ? value : defaultValue) as StorageValues[K];
      case StorageKey.WEB_COMBOS:
        return sanitizeWebCombosValue(value, defaultValue as StorageValues[StorageKey.WEB_COMBOS]) as StorageValues[K];
      case StorageKey.NO_MORE_DISPLAYED:
      case StorageKey.HOME_ITEM_ORDER:
        return sanitizeStringArrayValue(value, defaultValue as string[]) as StorageValues[K];
      case StorageKey.CARDS_PER_ROW:
        return sanitizeCardsPerRow(value, defaultValue as StorageValues[StorageKey.CARDS_PER_ROW]) as StorageValues[K];
      case StorageKey.SIDEBAR_WIDTH:
        return sanitizeSidebarWidth(value, defaultValue as StorageValues[StorageKey.SIDEBAR_WIDTH]) as StorageValues[K];
      case StorageKey.LANGUAGE:
        return (isLanguageValue(value) ? value : defaultValue) as StorageValues[K];
      case StorageKey.THEME:
        return (isThemeValue(value) ? value : defaultValue) as StorageValues[K];
      case StorageKey.TOOLS_CONFIG:
        return sanitizeToolConfig(value, defaultValue as StorageValues[StorageKey.TOOLS_CONFIG]) as StorageValues[K];
      default:
        return defaultValue;
    }
  }

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
        return this.normalize(key, JSON.parse(item), defaultValue);
      }

      // Handle string values
      if (typeof defaultValue === 'string') {
        return this.normalize(key, item, defaultValue);
      }

      // Handle number values
      if (typeof defaultValue === 'number') {
        return this.normalize(key, Number(item), defaultValue);
      }

      // Handle object/array values
      return this.normalize(key, JSON.parse(item), defaultValue);
    } catch (error) {
      logger.error('Error reading item from localStorage:', error);
      return defaultValue;
    }
  }

  /**
   * Set item in localStorage with type safety
   */
  set<K extends StorageKey>(key: K, value: StorageValues[K]): void {
    try {
      const normalizedValue = this.normalize(key, value, getDefaultValue(key));
      if (typeof normalizedValue === 'string') {
        localStorage.setItem(key, normalizedValue);
      } else {
        localStorage.setItem(key, JSON.stringify(normalizedValue));
      }
    } catch (error) {
      logger.error('Error saving item to localStorage:', error);
    }
  }

  /**
   * Remove item from localStorage
   */
  remove(key: StorageKey): void {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      logger.error('Error removing item from localStorage:', error);
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
  getFolderState(folderId: string, defaultExpanded = true): boolean {
    try {
      const key = `${FOLDER_STATE_PREFIX}${folderId}`;
      const stored = readBooleanStorageValue(key);
      if (stored !== null) return stored;

      // 兼容旧版本书签树展开状态，读取后迁移到统一前缀。
      const legacyKey = `${LEGACY_FOLDER_STATE_PREFIX}${folderId}`;
      const legacyStored = readBooleanStorageValue(legacyKey);
      if (legacyStored !== null) {
        localStorage.setItem(key, String(legacyStored));
        localStorage.removeItem(legacyKey);
        return legacyStored;
      }
    } catch (error) {
      logger.error('Error reading folder state:', error);
    }
    return defaultExpanded;
  }

  /**
   * Set folder expansion state
   */
  setFolderState(folderId: string, expanded: boolean): void {
    try {
      const key = `${FOLDER_STATE_PREFIX}${folderId}`;
      localStorage.setItem(key, String(expanded));
      localStorage.removeItem(`${LEGACY_FOLDER_STATE_PREFIX}${folderId}`);
    } catch (error) {
      logger.error('Error saving folder state:', error);
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

// Home Cards Per Row
export const cardsPerRow = {
  get: () => storage.get(StorageKey.CARDS_PER_ROW, 4),
  set: (value: StorageValues[StorageKey.CARDS_PER_ROW]) => storage.set(StorageKey.CARDS_PER_ROW, value),
};

// Home Item Order
export const homeItemOrder = {
  get: () => storage.get(StorageKey.HOME_ITEM_ORDER, []),
  set: (value: string[]) => storage.set(StorageKey.HOME_ITEM_ORDER, value),
};

// Newtab Sidebar Width
export const sidebarWidth = {
  get: () => storage.get(StorageKey.SIDEBAR_WIDTH, DEFAULT_SIDEBAR_WIDTH),
  set: (value: number) => storage.set(StorageKey.SIDEBAR_WIDTH, sanitizeSidebarWidth(value, DEFAULT_SIDEBAR_WIDTH)),
};

// Language
export const language = {
  get: () => storage.get(StorageKey.LANGUAGE, 'zh-CN'),
  set: (value: SupportedLanguage) => storage.set(StorageKey.LANGUAGE, value),
};

// Theme
export const theme = {
  get: () => storage.get(StorageKey.THEME, 'system'),
  set: (value: StorageValues[StorageKey.THEME]) => storage.set(StorageKey.THEME, value),
};

// Folder State
export const folderState = {
  get: (folderId: string, defaultExpanded = true) => storage.getFolderState(folderId, defaultExpanded),
  set: (folderId: string, expanded: boolean) => storage.setFolderState(folderId, expanded),
};

// Tools Configuration
export const toolsConfig = {
  get: () =>
    storage.get(StorageKey.TOOLS_CONFIG, DEFAULT_TOOL_CONFIG),
  set: (value: ToolConfig) => storage.set(StorageKey.TOOLS_CONFIG, value),
};
