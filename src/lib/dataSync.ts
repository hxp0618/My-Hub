import {
  getAllBookmarkTags,
  clearAllBookmarkTags,
  addBookmarkTag,
  getToolConfig,
  getLastSelectedTool,
  getToolUsageCounts,
  setToolConfig,
  setLastSelectedTool,
  setToolUsageCounts,
  migrateLegacyToolSettings,
  getAllSubscriptions,
  clearAllSubscriptions,
  batchAddSubscriptions,
  getSubscriptionSettings,
  setSubscriptionSettings,
  getSubscriptionNotificationConfig,
  setSubscriptionNotificationConfig,
} from '../db/indexedDB';
import { SortOrder, WebCombo } from '../pages/newtab/types';
import { BookmarkTag } from '../types/bookmarks';
import { LLMSettings } from '../types/llm';
import {
  BarkKeyConfig,
  BarkNotificationRecord,
  sanitizeBarkHistoryRecords,
  sanitizeBarkKeys,
} from '../types/bark';
import { ToolConfig, ToolId } from '../types/tools';
import {
  MenuItemId,
  MenuCustomization,
  isValidMenuOrder,
  isValidMenuCustomization,
  sanitizeMenuCustomization,
  MENU_ORDER_STORAGE_KEY,
  MENU_CUSTOMIZATION_STORAGE_KEY,
} from '../types/menu';
import {
  Subscription,
  SubscriptionNotificationConfig,
  SubscriptionSettings,
  DEFAULT_NOTIFICATION_CONFIG,
  DEFAULT_SUBSCRIPTION_SETTINGS,
  generateSubscriptionId,
} from '../types/subscription';
import {
  mergeSubscriptionNotificationConfigForImport,
  redactSubscriptionNotificationConfig,
} from '../utils/subscriptionNotificationConfigPrivacy';
import { createLogger } from '../utils/logger';
import {
  bookmarkSidebarCollapsed,
  cardsPerRow as cardsPerRowStorage,
  homeItemOrder as homeItemOrderStorage,
  isCardsPerRowValue,
  isLanguageValue,
  isSidebarWidthValue,
  isStringArrayValue,
  isThemeValue,
  language as languageStorage,
  noMoreDisplayed as noMoreDisplayedStorage,
  sanitizeStringArrayValue,
  sanitizeWebCombosValue,
  sidebarWidth as sidebarWidthStorage,
  theme as themeStorage,
  webCombos as webCombosStorage,
} from '../utils/storageManager';

const logger = createLogger('[dataSync]');

export {
  mergeSubscriptionNotificationConfigForImport,
  redactSubscriptionNotificationConfig,
} from '../utils/subscriptionNotificationConfigPrivacy';

interface ExportedBookmarkNode {
  title: string;
  url?: string;
  children?: ExportedBookmarkNode[];
}

interface LocalSettings {
  cardsPerRow?: number;
  autoSuggestBookmarkInfo?: boolean;
  language?: string;
  theme?: string;
  sidebarWidth?: number;
  bookmarkSortOrder?: SortOrder;
  bookmarkSidebarCollapsed?: boolean;
  homeItemOrder?: string[];
  bookmarkFolderStates?: Record<string, boolean>;
  menuOrder?: MenuItemId[];
  menuCustomization?: MenuCustomization;
}

interface ToolsData {
  config?: ToolConfig;
  lastSelectedTool?: ToolId | null;
  usageCount?: Record<string, number>;
}

interface BarkData {
  keys?: BarkKeyConfig[];
  selectedKeyId?: string | null;
  history?: BarkNotificationRecord[];
}

interface SubscriptionData {
  subscriptions?: Subscription[];
  notificationConfig?: SubscriptionNotificationConfig;
  settings?: SubscriptionSettings;
}

export interface ExportOptions {
  includeSensitiveData?: boolean;
}

interface ExportData {
  bookmarks: ExportedBookmarkNode[];
  tags: BookmarkTag[];
  combos: WebCombo[];
  noMoreDisplayed: string[];
  settings?: LocalSettings;
  tools?: ToolsData;
  llmSettings?: LLMSettings;
  bark?: BarkData;
  subscription?: SubscriptionData;
}

const BOOKMARK_FOLDER_STATE_PREFIX = 'bookmark-folder-state-';
const DEFAULT_TOOLS_CONFIG: ToolConfig = { enabledTools: Object.values(ToolId) };

const STORAGE_KEYS = {
  combos: 'webCombos',
  noMoreDisplayed: 'noMoreDisplayed',
  autoSuggest: 'autoSuggestBookmarkInfo',
  cardsPerRow: 'cardsPerRow',
  sidebarWidth: 'sidebarWidth',
  bookmarkSortOrder: 'bookmark_sort_order',
  bookmarkSidebarCollapsed: 'bookmark-sidebar-collapsed',
  homeItemOrder: 'homeItemOrder',
  menuOrder: MENU_ORDER_STORAGE_KEY,
  menuCustomization: MENU_CUSTOMIZATION_STORAGE_KEY,
  language: 'language',
  theme: 'theme',
  toolsConfig: 'tools_config',
  lastSelectedTool: 'last_selected_tool',
  toolUsageCount: 'tool_usage_count',
  llmSettings: 'llm_settings',
  barkKeys: 'bark_keys',
  barkSelectedKeyId: 'bark_selected_key_id',
  barkHistory: 'bark_notification_history',
};

const safeParseJSON = <T>(value: string | null, fallback: T): T => {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch (error) {
    logger.error('Failed to parse JSON value', error);
    return fallback;
  }
};

const parseNumberValue = (value: string | null): number | undefined => {
  if (value === null) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const parseBooleanValue = (value: string | null): boolean | undefined => {
  if (value === null) return undefined;
  if (value === 'true' || value === 'false') {
    return value === 'true';
  }
  try {
    const parsed = JSON.parse(value);
    return typeof parsed === 'boolean' ? parsed : undefined;
  } catch {
    return undefined;
  }
};

const isRecord = (value: unknown): value is Record<string, unknown> => (
  !!value && typeof value === 'object' && !Array.isArray(value)
);

const isSortOrderValue = (value: unknown): value is SortOrder => (
  isRecord(value) &&
  (value.key === 'dateAdded' || value.key === 'dateLastUsed' || value.key === 'title') &&
  (value.order === 'asc' || value.order === 'desc')
);

const sanitizeBookmarkFolderStates = (value: unknown): Record<string, boolean> | null => {
  if (!isRecord(value)) return null;

  const entries = Object.entries(value).filter((entry): entry is [string, boolean] => {
    const [folderId, expanded] = entry;
    return (
      folderId.length > 0 && typeof expanded === 'boolean'
    );
  });

  return Object.fromEntries(entries);
};

const collectBookmarkFolderStates = (): Record<string, boolean> => {
  const states: Record<string, boolean> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(BOOKMARK_FOLDER_STATE_PREFIX)) {
      states[key.replace(BOOKMARK_FOLDER_STATE_PREFIX, '')] = localStorage.getItem(key) === 'true';
    }
  }
  return states;
};

const clearBookmarkFolderStates = () => {
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(BOOKMARK_FOLDER_STATE_PREFIX)) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach(key => localStorage.removeItem(key));
};

const buildExportTree = (node: chrome.bookmarks.BookmarkTreeNode): ExportedBookmarkNode => {
  const newNode: ExportedBookmarkNode = {
    title: node.title,
  };
  if (node.url) {
    newNode.url = node.url;
  }
  if (node.children) {
    newNode.children = node.children.map(buildExportTree);
  }
  return newNode;
};

export const redactLLMSettings = (settings: LLMSettings): LLMSettings => ({
  ...settings,
  apiKey: '',
  providers: Object.fromEntries(
    Object.entries(settings.providers || {}).map(([providerId, provider]) => [
      providerId,
      {
        ...provider,
        apiKey: '',
      },
    ])
  ),
});

export const redactBarkKeys = (keys: BarkKeyConfig[]): BarkKeyConfig[] => (
  sanitizeBarkKeys(keys).map(key => ({
    ...key,
    deviceKey: '',
  }))
);

export const mergeLLMSettingsForImport = (
  incoming: LLMSettings,
  existing: LLMSettings | null
): LLMSettings => {
  if (!existing) return incoming;

  return {
    ...incoming,
    apiKey: incoming.apiKey || existing.apiKey,
    providers: Object.fromEntries(
      Object.entries(incoming.providers || {}).map(([providerId, provider]) => {
        const existingProvider = existing.providers?.[providerId];
        return [
          providerId,
          {
            ...provider,
            apiKey: provider.apiKey || existingProvider?.apiKey || '',
          },
        ];
      })
    ),
  };
};

export const mergeBarkKeysForImport = (
  incomingKeys: BarkKeyConfig[],
  existingKeys: BarkKeyConfig[]
): BarkKeyConfig[] => {
  const existingById = new Map(sanitizeBarkKeys(existingKeys).map(key => [key.id, key]));

  return sanitizeBarkKeys(incomingKeys, { allowEmptyDeviceKey: true })
    .map(key => {
      if (key.deviceKey) return key;

      const existingKey = existingById.get(key.id);
      if (!existingKey?.deviceKey) return null;

      return {
        ...key,
        deviceKey: existingKey.deviceKey,
      };
    })
    .filter((key): key is BarkKeyConfig => key !== null);
};

export const exportData = async (options: ExportOptions = {}): Promise<void> => {
  try {
    const includeSensitiveData = options.includeSensitiveData === true;
    const [bookmarkTree] = await chrome.bookmarks.getTree();
    const tags = await getAllBookmarkTags();
    const combos = sanitizeWebCombosValue(
      safeParseJSON<unknown>(localStorage.getItem(STORAGE_KEYS.combos), []),
      []
    );
    const noMoreDisplayed = sanitizeStringArrayValue(
      safeParseJSON<unknown>(localStorage.getItem(STORAGE_KEYS.noMoreDisplayed), []),
      []
    );

    const exportedBookmarks = bookmarkTree.children ? bookmarkTree.children.map(buildExportTree) : [];

    const data: ExportData = {
      bookmarks: exportedBookmarks,
      tags,
      combos,
      noMoreDisplayed,
    };

    // General settings
    const settings: LocalSettings = {};
    const cardsPerRow = parseNumberValue(localStorage.getItem(STORAGE_KEYS.cardsPerRow));
    if (isCardsPerRowValue(cardsPerRow)) {
      settings.cardsPerRow = cardsPerRow;
    }

    const autoSuggest = parseBooleanValue(localStorage.getItem(STORAGE_KEYS.autoSuggest));
    if (autoSuggest !== undefined) {
      settings.autoSuggestBookmarkInfo = autoSuggest;
    }

    const language = localStorage.getItem(STORAGE_KEYS.language);
    if (isLanguageValue(language)) {
      settings.language = language;
    }

    const theme = localStorage.getItem(STORAGE_KEYS.theme);
    if (isThemeValue(theme)) {
      settings.theme = theme;
    }

    const sidebarWidth = parseNumberValue(localStorage.getItem(STORAGE_KEYS.sidebarWidth));
    if (isSidebarWidthValue(sidebarWidth)) {
      settings.sidebarWidth = sidebarWidth;
    }

    const bookmarkSortOrder = safeParseJSON<SortOrder | null>(
      localStorage.getItem(STORAGE_KEYS.bookmarkSortOrder),
      null
    );
    if (isSortOrderValue(bookmarkSortOrder)) {
      settings.bookmarkSortOrder = bookmarkSortOrder;
    }

    const bookmarkSidebarCollapsed = parseBooleanValue(localStorage.getItem(STORAGE_KEYS.bookmarkSidebarCollapsed));
    if (bookmarkSidebarCollapsed !== undefined) {
      settings.bookmarkSidebarCollapsed = bookmarkSidebarCollapsed;
    }

    const homeItemOrder = safeParseJSON<unknown>(
      localStorage.getItem(STORAGE_KEYS.homeItemOrder),
      null
    );
    if (isStringArrayValue(homeItemOrder)) {
      settings.homeItemOrder = homeItemOrder;
    }

    // Menu order
    const menuOrder = safeParseJSON<MenuItemId[] | null>(
      localStorage.getItem(STORAGE_KEYS.menuOrder),
      null
    );
    if (menuOrder !== null && isValidMenuOrder(menuOrder)) {
      settings.menuOrder = menuOrder;
    }

    // Menu customization
    const menuCustomization = safeParseJSON<MenuCustomization | null>(
      localStorage.getItem(STORAGE_KEYS.menuCustomization),
      null
    );
    if (menuCustomization !== null) {
      const sanitizedCustomization = sanitizeMenuCustomization(menuCustomization);
      if (isValidMenuCustomization(menuCustomization) || Object.keys(sanitizedCustomization).length > 0) {
        settings.menuCustomization = sanitizedCustomization;
      }
    }

    settings.bookmarkFolderStates = collectBookmarkFolderStates();

    if (Object.keys(settings).length > 0) {
      data.settings = settings;
    }

    await migrateLegacyToolSettings();
    const toolConfig = await getToolConfig();
    const lastSelectedTool = await getLastSelectedTool();
    const usageCount = await getToolUsageCounts();
    data.tools = {
      config: toolConfig || DEFAULT_TOOLS_CONFIG,
      lastSelectedTool: lastSelectedTool || null,
      usageCount: usageCount || {},
    };

    // LLM settings
    const llmSettings = safeParseJSON<LLMSettings | null>(
      localStorage.getItem(STORAGE_KEYS.llmSettings),
      null
    );
    if (llmSettings) {
      data.llmSettings = includeSensitiveData ? llmSettings : redactLLMSettings(llmSettings);
    }

    // Bark notifier
    const barkKeys = sanitizeBarkKeys(
      safeParseJSON<unknown>(localStorage.getItem(STORAGE_KEYS.barkKeys), [])
    );
    // 默认导出不携带可直接发送通知的密钥和历史内容，避免备份文件泄露隐私。
    data.bark = {
      keys: includeSensitiveData ? barkKeys : redactBarkKeys(barkKeys),
      selectedKeyId: localStorage.getItem(STORAGE_KEYS.barkSelectedKeyId),
      history: includeSensitiveData
        ? sanitizeBarkHistoryRecords(
          safeParseJSON<unknown>(localStorage.getItem(STORAGE_KEYS.barkHistory), [])
        )
        : [],
    };

    // Subscription manager
    const subscriptions = await getAllSubscriptions();
    const subscriptionNotificationConfig = await getSubscriptionNotificationConfig();
    const subscriptionSettings = await getSubscriptionSettings();
    data.subscription = {
      subscriptions,
      notificationConfig: includeSensitiveData
        ? subscriptionNotificationConfig
        : redactSubscriptionNotificationConfig(subscriptionNotificationConfig),
      settings: subscriptionSettings,
    };

    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `chrome_history_export_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (error) {
    logger.error('Error exporting data', error);
    throw error;
  }
};

const getAllBookmarkUrls = async (): Promise<Set<string>> => {
  const urlSet = new Set<string>();
  const [tree] = await chrome.bookmarks.getTree();
  const traverse = (nodes: chrome.bookmarks.BookmarkTreeNode[]) => {
    for (const node of nodes) {
      if (node.url) {
        urlSet.add(node.url);
      }
      if (node.children) {
        traverse(node.children);
      }
    }
  };
  if (tree.children) {
    traverse(tree.children);
  }
  return urlSet;
};

const importBookmarksByName = async (
  nodes: ExportedBookmarkNode[],
  parentId: string,
  existingUrls: Set<string>
) => {
  const parentChildren = await chrome.bookmarks.getChildren(parentId);

  for (const node of nodes) {
    if (node.url) { // It's a bookmark
      if (!existingUrls.has(node.url)) {
        await chrome.bookmarks.create({
          parentId,
          title: node.title,
          url: node.url,
        });
        existingUrls.add(node.url);
      }
    } else if (node.children) { // It's a folder
      let folder = parentChildren.find(c => !c.url && c.title === node.title);
      if (!folder) {
        folder = await chrome.bookmarks.create({
          parentId,
          title: node.title,
        });
      }
      await importBookmarksByName(node.children, folder.id, existingUrls);
    }
  }
};


export const importData = async (file: File): Promise<void> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => {
      reject(reader.error ?? new Error('Failed to read import file'));
    };

    reader.onload = async (event) => {
      try {
        const json = event.target?.result as string;
        const data: ExportData = JSON.parse(json);

      const existingUrls = await getAllBookmarkUrls();

      // Import Bookmarks
      // Merges bookmarks from the import file into the existing bookmark structure by matching folder names.
      if (data.bookmarks && data.bookmarks.length > 0) {
        const [rootNode] = await chrome.bookmarks.getTree();
        const chromeTopLevelFolders = rootNode.children || [];

        for (const importedTopFolder of data.bookmarks) {
          if (importedTopFolder.children && importedTopFolder.children.length > 0) {
            const matchingChromeFolder = chromeTopLevelFolders.find(
              (chromeFolder) => !chromeFolder.url && chromeFolder.title === importedTopFolder.title
            );

            if (matchingChromeFolder) {
              await importBookmarksByName(importedTopFolder.children, matchingChromeFolder.id, existingUrls);
            } else {
              logger.warn('Top-level bookmark folder from import data was not found in Chrome; skipping that folder');
            }
          }
        }
      }

      // Import Tags
      if (data.tags && Array.isArray(data.tags) && data.tags.length > 0) {
        await clearAllBookmarkTags();
        for (const tag of data.tags) {
          await addBookmarkTag(tag);
        }
      }

      // Import Combos
      if ('combos' in data) {
        webCombosStorage.set(sanitizeWebCombosValue(data.combos, []));
      }

      // Import No More Displayed
      if ('noMoreDisplayed' in data) {
        noMoreDisplayedStorage.set(sanitizeStringArrayValue(data.noMoreDisplayed, []));
      }

      // Import general settings
      if (data.settings) {
        const settings = data.settings;
        if (isCardsPerRowValue(settings.cardsPerRow)) {
          cardsPerRowStorage.set(settings.cardsPerRow);
        }
        if (typeof settings.autoSuggestBookmarkInfo === 'boolean') {
          localStorage.setItem(
            STORAGE_KEYS.autoSuggest,
            JSON.stringify(settings.autoSuggestBookmarkInfo)
          );
        }
        if (isLanguageValue(settings.language)) {
          languageStorage.set(settings.language);
        }
        if (isThemeValue(settings.theme)) {
          themeStorage.set(settings.theme);
        }
        if (isSidebarWidthValue(settings.sidebarWidth)) {
          sidebarWidthStorage.set(settings.sidebarWidth);
        }
        if (isSortOrderValue(settings.bookmarkSortOrder)) {
          localStorage.setItem(STORAGE_KEYS.bookmarkSortOrder, JSON.stringify(settings.bookmarkSortOrder));
        }
        if (typeof settings.bookmarkSidebarCollapsed === 'boolean') {
          bookmarkSidebarCollapsed.set(settings.bookmarkSidebarCollapsed);
        }
        if (isStringArrayValue(settings.homeItemOrder)) {
          homeItemOrderStorage.set(settings.homeItemOrder);
        }
        // Import menu order
        if ('menuOrder' in settings && settings.menuOrder !== undefined) {
          if (isValidMenuOrder(settings.menuOrder)) {
            localStorage.setItem(STORAGE_KEYS.menuOrder, JSON.stringify(settings.menuOrder));
          } else {
            logger.warn('Invalid menu order in import data, skipping');
          }
        }
        // Import menu customization
        if ('menuCustomization' in settings && settings.menuCustomization !== undefined) {
          const sanitizedCustomization = sanitizeMenuCustomization(settings.menuCustomization);
          if (
            isValidMenuCustomization(settings.menuCustomization) ||
            Object.keys(sanitizedCustomization).length > 0
          ) {
            localStorage.setItem(STORAGE_KEYS.menuCustomization, JSON.stringify(sanitizedCustomization));
          } else {
            logger.warn('Invalid menu customization in import data, skipping');
          }
        }
        const bookmarkFolderStates = sanitizeBookmarkFolderStates(settings.bookmarkFolderStates);
        if (bookmarkFolderStates) {
          clearBookmarkFolderStates();
          Object.entries(bookmarkFolderStates).forEach(([folderId, expanded]) => {
            localStorage.setItem(`${BOOKMARK_FOLDER_STATE_PREFIX}${folderId}`, String(expanded));
          });
        }
      }

      // Import tools config
      if (data.tools) {
        if (data.tools.config) {
          await setToolConfig(data.tools.config);
        }
        if ('lastSelectedTool' in data.tools) {
          await setLastSelectedTool((data.tools.lastSelectedTool as ToolId | null) || null);
        }
        if (data.tools.usageCount) {
          await setToolUsageCounts(data.tools.usageCount);
        }
      }

      // Import LLM settings
      if (data.llmSettings) {
        const existingLLMSettings = safeParseJSON<LLMSettings | null>(
          localStorage.getItem(STORAGE_KEYS.llmSettings),
          null
        );
        localStorage.setItem(
          STORAGE_KEYS.llmSettings,
          JSON.stringify(mergeLLMSettingsForImport(data.llmSettings, existingLLMSettings))
        );
      }

      // Import Bark notifier data
      if (data.bark) {
        if (data.bark.keys) {
          const existingBarkKeys = sanitizeBarkKeys(safeParseJSON<unknown>(
            localStorage.getItem(STORAGE_KEYS.barkKeys),
            []
          ));
          const mergedBarkKeys = mergeBarkKeysForImport(data.bark.keys, existingBarkKeys);
          localStorage.setItem(STORAGE_KEYS.barkKeys, JSON.stringify(mergedBarkKeys));
        }
        if ('selectedKeyId' in data.bark) {
          const currentKeys = sanitizeBarkKeys(
            safeParseJSON<unknown>(localStorage.getItem(STORAGE_KEYS.barkKeys), [])
          );
          const selectedKeyExists = currentKeys.some(key => key.id === data.bark?.selectedKeyId);
          if (data.bark.selectedKeyId && selectedKeyExists) {
            localStorage.setItem(STORAGE_KEYS.barkSelectedKeyId, data.bark.selectedKeyId);
          } else {
            localStorage.removeItem(STORAGE_KEYS.barkSelectedKeyId);
          }
        }
        if (data.bark.history) {
          localStorage.setItem(
            STORAGE_KEYS.barkHistory,
            JSON.stringify(sanitizeBarkHistoryRecords(data.bark.history))
          );
        }
      }

      // Import Subscription manager data
      if (data.subscription) {
        // Import subscriptions
        if (data.subscription.subscriptions && Array.isArray(data.subscription.subscriptions)) {
          await clearAllSubscriptions();
          const now = Date.now();
          const subscriptionsToImport = data.subscription.subscriptions.map((sub: Subscription) => ({
            ...sub,
            id: generateSubscriptionId(),
            createdAt: sub.createdAt || now,
            updatedAt: now,
          }));
          if (subscriptionsToImport.length > 0) {
            await batchAddSubscriptions(subscriptionsToImport);
          }
        }
        // Import notification config
        if (data.subscription.notificationConfig) {
          const existingNotificationConfig = await getSubscriptionNotificationConfig();
          const mergedNotificationConfig = mergeSubscriptionNotificationConfigForImport(
            {
              ...DEFAULT_NOTIFICATION_CONFIG,
              ...data.subscription.notificationConfig,
            },
            existingNotificationConfig
          );
          await setSubscriptionNotificationConfig({
            ...DEFAULT_NOTIFICATION_CONFIG,
            ...mergedNotificationConfig,
          });
        }
        // Import settings
        if (data.subscription.settings) {
          await setSubscriptionSettings({
            ...DEFAULT_SUBSCRIPTION_SETTINGS,
            ...data.subscription.settings,
          });
        }
      }

        resolve();
      } catch (error) {
        logger.error('Error importing data', error);
        reject(error);
      }
    };

    reader.readAsText(file);
  });
};
