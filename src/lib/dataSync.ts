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
} from '../db/indexedDB';
import { SortOrder, WebCombo } from '../pages/newtab/types';
import { BookmarkTag } from '../types/bookmarks';
import { LLMSettings } from '../types/llm';
import { BarkKeyConfig, BarkNotificationRecord } from '../types/bark';
import { ToolConfig, ToolId } from '../types/tools';
import { MenuItemId, MenuCustomization, isValidMenuOrder, isValidMenuCustomization, MENU_ORDER_STORAGE_KEY, MENU_CUSTOMIZATION_STORAGE_KEY } from '../types/menu';
import i18n from '../i18n';

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

interface ExportData {
  bookmarks: ExportedBookmarkNode[];
  tags: BookmarkTag[];
  combos: WebCombo[];
  noMoreDisplayed: string[];
  settings?: LocalSettings;
  tools?: ToolsData;
  llmSettings?: LLMSettings;
  bark?: BarkData;
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
    console.error('Failed to parse JSON value:', error);
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
    return JSON.parse(value);
  } catch {
    return undefined;
  }
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

export const exportData = async (): Promise<void> => {
  try {
    const [bookmarkTree] = await chrome.bookmarks.getTree();
    const tags = await getAllBookmarkTags();
    const combos = safeParseJSON<WebCombo[]>(localStorage.getItem(STORAGE_KEYS.combos), []);
    const noMoreDisplayed = safeParseJSON<string[]>(localStorage.getItem(STORAGE_KEYS.noMoreDisplayed), []);

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
    if (cardsPerRow !== undefined) {
      settings.cardsPerRow = cardsPerRow;
    }

    const autoSuggest = parseBooleanValue(localStorage.getItem(STORAGE_KEYS.autoSuggest));
    if (autoSuggest !== undefined) {
      settings.autoSuggestBookmarkInfo = autoSuggest;
    }

    const language = localStorage.getItem(STORAGE_KEYS.language);
    if (language) {
      settings.language = language;
    }

    const theme = localStorage.getItem(STORAGE_KEYS.theme);
    if (theme) {
      settings.theme = theme;
    }

    const sidebarWidth = parseNumberValue(localStorage.getItem(STORAGE_KEYS.sidebarWidth));
    if (sidebarWidth !== undefined) {
      settings.sidebarWidth = sidebarWidth;
    }

    const bookmarkSortOrder = safeParseJSON<SortOrder | null>(
      localStorage.getItem(STORAGE_KEYS.bookmarkSortOrder),
      null
    );
    if (bookmarkSortOrder && bookmarkSortOrder.key && bookmarkSortOrder.order) {
      settings.bookmarkSortOrder = bookmarkSortOrder;
    }

    const bookmarkSidebarCollapsed = parseBooleanValue(localStorage.getItem(STORAGE_KEYS.bookmarkSidebarCollapsed));
    if (bookmarkSidebarCollapsed !== undefined) {
      settings.bookmarkSidebarCollapsed = bookmarkSidebarCollapsed;
    }

    const homeItemOrder = safeParseJSON<string[] | null>(
      localStorage.getItem(STORAGE_KEYS.homeItemOrder),
      null
    );
    if (homeItemOrder !== null) {
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
    if (menuCustomization !== null && isValidMenuCustomization(menuCustomization)) {
      settings.menuCustomization = menuCustomization;
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
      data.llmSettings = llmSettings;
    }

    // Bark notifier
    data.bark = {
      keys: safeParseJSON<BarkKeyConfig[]>(localStorage.getItem(STORAGE_KEYS.barkKeys), []),
      selectedKeyId: localStorage.getItem(STORAGE_KEYS.barkSelectedKeyId),
      history: safeParseJSON<BarkNotificationRecord[]>(localStorage.getItem(STORAGE_KEYS.barkHistory), []),
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
    console.error('Error exporting data:', error);
    alert(i18n.t('dataSync.exportError'));
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
  const reader = new FileReader();
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
              console.warn(
                `Top-level bookmark folder "${importedTopFolder.title}" not found in Chrome. Skipping import for this folder.`
              );
            }
          }
        }
      }

      // Import Tags
      if (data.tags) {
        await clearAllBookmarkTags();
        for (const tag of data.tags) {
          await addBookmarkTag(tag);
        }
      }

      // Import Combos
      if (data.combos) {
        localStorage.setItem(STORAGE_KEYS.combos, JSON.stringify(data.combos));
      }

      // Import No More Displayed
      if (data.noMoreDisplayed) {
        localStorage.setItem(STORAGE_KEYS.noMoreDisplayed, JSON.stringify(data.noMoreDisplayed));
      }

      // Import general settings
      if (data.settings) {
        const settings = data.settings;
        if ('cardsPerRow' in settings && settings.cardsPerRow !== undefined) {
          localStorage.setItem(STORAGE_KEYS.cardsPerRow, String(settings.cardsPerRow));
        }
        if ('autoSuggestBookmarkInfo' in settings && settings.autoSuggestBookmarkInfo !== undefined) {
          localStorage.setItem(
            STORAGE_KEYS.autoSuggest,
            JSON.stringify(settings.autoSuggestBookmarkInfo)
          );
        }
        if (settings.language) {
          localStorage.setItem(STORAGE_KEYS.language, settings.language);
        }
        if (settings.theme) {
          localStorage.setItem(STORAGE_KEYS.theme, settings.theme);
        }
        if ('sidebarWidth' in settings && settings.sidebarWidth !== undefined) {
          localStorage.setItem(STORAGE_KEYS.sidebarWidth, String(settings.sidebarWidth));
        }
        if (settings.bookmarkSortOrder) {
          localStorage.setItem(STORAGE_KEYS.bookmarkSortOrder, JSON.stringify(settings.bookmarkSortOrder));
        }
        if ('bookmarkSidebarCollapsed' in settings && settings.bookmarkSidebarCollapsed !== undefined) {
          localStorage.setItem(
            STORAGE_KEYS.bookmarkSidebarCollapsed,
            JSON.stringify(settings.bookmarkSidebarCollapsed)
          );
        }
        if ('homeItemOrder' in settings && settings.homeItemOrder !== undefined) {
          localStorage.setItem(STORAGE_KEYS.homeItemOrder, JSON.stringify(settings.homeItemOrder));
        }
        // Import menu order
        if ('menuOrder' in settings && settings.menuOrder !== undefined) {
          if (isValidMenuOrder(settings.menuOrder)) {
            localStorage.setItem(STORAGE_KEYS.menuOrder, JSON.stringify(settings.menuOrder));
          } else {
            console.warn('Invalid menu order in import data, skipping');
          }
        }
        // Import menu customization
        if ('menuCustomization' in settings && settings.menuCustomization !== undefined) {
          if (isValidMenuCustomization(settings.menuCustomization)) {
            localStorage.setItem(STORAGE_KEYS.menuCustomization, JSON.stringify(settings.menuCustomization));
          } else {
            console.warn('Invalid menu customization in import data, skipping');
          }
        }
        if ('bookmarkFolderStates' in settings && settings.bookmarkFolderStates !== undefined) {
          clearBookmarkFolderStates();
          Object.entries(settings.bookmarkFolderStates).forEach(([folderId, expanded]) => {
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
        localStorage.setItem(STORAGE_KEYS.llmSettings, JSON.stringify(data.llmSettings));
      }

      // Import Bark notifier data
      if (data.bark) {
        if (data.bark.keys) {
          localStorage.setItem(STORAGE_KEYS.barkKeys, JSON.stringify(data.bark.keys));
        }
        if ('selectedKeyId' in data.bark) {
          if (data.bark.selectedKeyId) {
            localStorage.setItem(STORAGE_KEYS.barkSelectedKeyId, data.bark.selectedKeyId);
          } else {
            localStorage.removeItem(STORAGE_KEYS.barkSelectedKeyId);
          }
        }
        if (data.bark.history) {
          localStorage.setItem(STORAGE_KEYS.barkHistory, JSON.stringify(data.bark.history));
        }
      }

      alert(i18n.t('dataSync.importSuccess'));
    } catch (error) {
      console.error('Error importing data:', error);
      alert(i18n.t('dataSync.importError'));
    }
  };
  reader.readAsText(file);
};
