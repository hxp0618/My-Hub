import { BookmarkTag } from '../types/bookmarks';
import { TagGenerationFailure, sanitizeTagGenerationFailureReason } from '../types/tags';
import {
  DEFAULT_TOOL_CONFIG,
  ToolConfig,
  ToolId,
  getValidToolOrder,
  isToolIdValue,
  sanitizeToolConfig,
  sanitizeToolUsageCounts,
} from '../types/tools';
import {
  HistoryEntry,
  sanitizeHttpHistoryEntries,
  sanitizeHttpHistoryEntry,
} from '../types/http';
import {
  Subscription,
  SubscriptionSettings,
  SubscriptionNotificationConfig,
  DEFAULT_SUBSCRIPTION_SETTINGS,
  DEFAULT_NOTIFICATION_CONFIG,
} from '../types/subscription';
import { createLogger } from '../utils/logger';

const logger = createLogger('[IndexedDB]');

const DB_NAME = 'ChromeHistoryDB';
const DB_VERSION = 7; // v7: add subscription management stores
const STORE_NAME = 'bookmark_tags';
const FAILURES_STORE_NAME = 'tag_generation_failures';
const TOOL_SETTINGS_STORE_NAME = 'tool_settings';
const HTTP_HISTORY_STORE_NAME = 'http_request_history';
const SUBSCRIPTIONS_STORE_NAME = 'subscriptions';
const SUBSCRIPTION_SETTINGS_STORE_NAME = 'subscription_settings';
const SUBSCRIPTION_NOTIFICATION_CONFIG_STORE_NAME = 'subscription_notification_config';

let db: IDBDatabase | null = null;

export const closeDB = (): void => {
  db?.close();
  db = null;
};

export const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (db) {
      return resolve(db);
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      logger.error('Database error', request.error);
      reject('Database error');
    };

    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;
      const oldVersion = event.oldVersion;

      // 版本 1: 创建书签标签存储
      if (oldVersion < 1) {
        if (!database.objectStoreNames.contains(STORE_NAME)) {
          database.createObjectStore(STORE_NAME, { keyPath: 'url' });
        }
      }

      // 版本 2: 之前创建了阅读列表存储（现已废弃）

      // 版本 3: 删除阅读列表相关存储
      if (oldVersion < 3) {
        // 删除阅读列表存储（如果存在）
        if (database.objectStoreNames.contains('reading_list')) {
          database.deleteObjectStore('reading_list');
        }
        if (database.objectStoreNames.contains('reading_progress')) {
          database.deleteObjectStore('reading_progress');
        }
      }

      // 版本 4: 添加标签生成失败跟踪存储
      if (oldVersion < 4) {
        if (!database.objectStoreNames.contains(FAILURES_STORE_NAME)) {
          database.createObjectStore(FAILURES_STORE_NAME, { keyPath: 'url' });
        }
      }

      // 版本 5: 添加工具配置存储
      if (oldVersion < 5) {
        if (!database.objectStoreNames.contains(TOOL_SETTINGS_STORE_NAME)) {
          database.createObjectStore(TOOL_SETTINGS_STORE_NAME, { keyPath: 'key' });
        }
      }

      // 版本 6: 添加 HTTP 请求历史存储
      if (oldVersion < 6) {
        if (!database.objectStoreNames.contains(HTTP_HISTORY_STORE_NAME)) {
          database.createObjectStore(HTTP_HISTORY_STORE_NAME, { keyPath: 'id' });
        }
      }

      // 版本 7: 添加订阅管理相关存储
      if (oldVersion < 7) {
        if (!database.objectStoreNames.contains(SUBSCRIPTIONS_STORE_NAME)) {
          const subscriptionsStore = database.createObjectStore(SUBSCRIPTIONS_STORE_NAME, { keyPath: 'id' });
          subscriptionsStore.createIndex('expiryDate', 'expiryDate', { unique: false });
          subscriptionsStore.createIndex('status', 'status', { unique: false });
        }
        if (!database.objectStoreNames.contains(SUBSCRIPTION_SETTINGS_STORE_NAME)) {
          database.createObjectStore(SUBSCRIPTION_SETTINGS_STORE_NAME, { keyPath: 'key' });
        }
        if (!database.objectStoreNames.contains(SUBSCRIPTION_NOTIFICATION_CONFIG_STORE_NAME)) {
          database.createObjectStore(SUBSCRIPTION_NOTIFICATION_CONFIG_STORE_NAME, { keyPath: 'key' });
        }
      }
    };
  });
};

export const addBookmarkTag = async (bookmarkTag: BookmarkTag): Promise<void> => {
  const db = await initDB();
  const transaction = db.transaction([STORE_NAME], 'readwrite');
  const store = transaction.objectStore(STORE_NAME);
  store.put(bookmarkTag);

  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => {
      resolve();
    };
    transaction.onerror = () => {
      reject(transaction.error);
    };
  });
};

export const getBookmarkTag = async (url: string): Promise<BookmarkTag | undefined> => {
    const db = await initDB();
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(url);

    return new Promise((resolve, reject) => {
        request.onsuccess = () => {
            resolve(request.result);
        };
        request.onerror = () => {
            reject(request.error);
        };
    });
};

export const getAllBookmarkTags = async (): Promise<BookmarkTag[]> => {
    const db = await initDB();
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    return new Promise((resolve, reject) => {
        request.onsuccess = () => {
            resolve(request.result);
        };
        request.onerror = () => {
            reject(request.error);
        };
    });
};


export const deleteBookmarkTag = async (url: string): Promise<void> => {
  const db = await initDB();
  const transaction = db.transaction([STORE_NAME], 'readwrite');
  const store = transaction.objectStore(STORE_NAME);
  store.delete(url);

  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => {
      resolve();
    };
    transaction.onerror = () => {
      reject(transaction.error);
    };
  });
};

// 批量删除多个书签标签
export const deleteMultipleBookmarkTags = async (urls: string[]): Promise<void> => {
  const db = await initDB();
  const transaction = db.transaction([STORE_NAME], 'readwrite');
  const store = transaction.objectStore(STORE_NAME);
  
  // 在一个事务中删除所有指定的记录
  urls.forEach(url => {
    store.delete(url);
  });

  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => {
      resolve();
    };
    transaction.onerror = () => {
      reject(transaction.error);
    };
  });
};

// 批量更新标签
export const batchUpdateTags = async (updates: { url: string; tags: string[] }[]): Promise<void> => {
  const db = await initDB();
  const transaction = db.transaction([STORE_NAME], 'readwrite');
  const store = transaction.objectStore(STORE_NAME);
  
  // 在一个事务中更新所有记录
  updates.forEach(update => {
    store.put(update);
  });

  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => {
      resolve();
    };
    transaction.onerror = () => {
      reject(transaction.error);
    };
  });
};

export const clearAllBookmarkTags = async (): Promise<void> => {
  const db = await initDB();
  const transaction = db.transaction([STORE_NAME], 'readwrite');
  const store = transaction.objectStore(STORE_NAME);
  store.clear();

  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => {
      resolve();
    };
    transaction.onerror = () => {
      reject(transaction.error);
    };
  });
};

// ==================== Tool Settings (ToolConfig / usage) ====================

type ToolSettingKey = 'config' | 'last_selected_tool' | 'tool_usage_count' | 'tool_order';

type ToolSettingRecord<T> = {
  key: ToolSettingKey;
  value: T;
};

const readLegacyJsonSetting = (key: string): { found: boolean; value?: unknown } => {
  const raw = localStorage.getItem(key);
  if (raw === null) return { found: false };

  try {
    return { found: true, value: JSON.parse(raw) };
  } catch (error) {
    logger.warn('Ignoring invalid legacy tool setting JSON', { key, error });
    localStorage.removeItem(key);
    return { found: false };
  }
};

const getToolSetting = async <T>(key: ToolSettingKey, defaultValue: T): Promise<T> => {
  const db = await initDB();
  if (!db.objectStoreNames.contains(TOOL_SETTINGS_STORE_NAME)) {
    return defaultValue;
  }
  const transaction = db.transaction([TOOL_SETTINGS_STORE_NAME], 'readonly');
  const store = transaction.objectStore(TOOL_SETTINGS_STORE_NAME);
  const request = store.get(key);

  return new Promise((resolve, reject) => {
    request.onsuccess = () => {
      const record = request.result as ToolSettingRecord<T> | undefined;
      resolve(record?.value ?? defaultValue);
    };
    request.onerror = () => reject(request.error);
  });
};

const setToolSetting = async <T>(key: ToolSettingKey, value: T): Promise<void> => {
  const db = await initDB();
  const transaction = db.transaction([TOOL_SETTINGS_STORE_NAME], 'readwrite');
  const store = transaction.objectStore(TOOL_SETTINGS_STORE_NAME);
  store.put({ key, value });

  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
};

export const migrateLegacyToolSettings = async (): Promise<void> => {
  try {
    // Only migrate if IndexedDB store is empty
    const existingConfig = await getToolSetting<ToolConfig | null>('config', null);
    const hasConfig = !!existingConfig && existingConfig.enabledTools?.length > 0;

    const legacyConfig = readLegacyJsonSetting('tools_config');
    if (legacyConfig.found) {
      if (!hasConfig) {
        await setToolSetting('config', sanitizeToolConfig(legacyConfig.value));
      }
      localStorage.removeItem('tools_config');
    }

    const legacyLastSelected = localStorage.getItem('last_selected_tool');
    if (isToolIdValue(legacyLastSelected)) {
      await setToolSetting('last_selected_tool', legacyLastSelected);
    }
    if (legacyLastSelected !== null) {
      localStorage.removeItem('last_selected_tool');
    }

    const legacyUsage = readLegacyJsonSetting('tool_usage_count');
    if (legacyUsage.found) {
      await setToolSetting('tool_usage_count', sanitizeToolUsageCounts(legacyUsage.value));
      localStorage.removeItem('tool_usage_count');
    }
  } catch (error) {
    logger.error('Failed to migrate legacy tool settings', error);
  }
};

export const getToolConfig = async (): Promise<ToolConfig> =>
  sanitizeToolConfig(await getToolSetting<unknown>('config', DEFAULT_TOOL_CONFIG));

export const setToolConfig = async (config: ToolConfig): Promise<void> =>
  setToolSetting('config', sanitizeToolConfig(config));

export const getLastSelectedTool = async (): Promise<ToolId | null> => {
  const stored = await getToolSetting<unknown>('last_selected_tool', null);
  return isToolIdValue(stored) ? stored : null;
};

export const setLastSelectedTool = async (toolId: ToolId | null): Promise<void> =>
  setToolSetting('last_selected_tool', isToolIdValue(toolId) ? toolId : null);

export const getToolUsageCounts = async (): Promise<Record<string, number>> =>
  sanitizeToolUsageCounts(await getToolSetting<unknown>('tool_usage_count', {}));

export const setToolUsageCounts = async (counts: Record<string, number>): Promise<void> =>
  setToolSetting('tool_usage_count', sanitizeToolUsageCounts(counts));

export const incrementToolUsageCount = async (toolId: ToolId): Promise<void> => {
  const counts = await getToolUsageCounts();
  counts[toolId] = (counts[toolId] || 0) + 1;
  await setToolUsageCounts(counts);
};

// ==================== Tool Order ====================

/**
 * 获取工具顺序
 * 如果没有保存的顺序，返回默认顺序
 * 自动验证和补全缺失的工具
 */
export const getToolOrder = async (): Promise<ToolId[]> => {
  const stored = await getToolSetting<ToolId[] | null>('tool_order', null);
  return getValidToolOrder(stored);
};

/**
 * 保存工具顺序
 */
export const setToolOrder = async (order: ToolId[]): Promise<void> => {
  const validOrder = getValidToolOrder(order);
  await setToolSetting('tool_order', validOrder);
};

// ==================== Tag Generation Failure Tracking ====================

const sanitizeTagGenerationFailureRecord = (
  failure: TagGenerationFailure | undefined
): TagGenerationFailure | undefined => {
  if (!failure) return undefined;
  return {
    ...failure,
    failureReason: sanitizeTagGenerationFailureReason(failure.failureReason),
  };
};

export const addTagGenerationFailure = async (failure: TagGenerationFailure): Promise<void> => {
  const db = await initDB();
  const transaction = db.transaction([FAILURES_STORE_NAME], 'readwrite');
  const store = transaction.objectStore(FAILURES_STORE_NAME);
  store.put(sanitizeTagGenerationFailureRecord(failure));

  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => {
      resolve();
    };
    transaction.onerror = () => {
      reject(transaction.error);
    };
  });
};

export const getTagGenerationFailure = async (url: string): Promise<TagGenerationFailure | undefined> => {
  const db = await initDB();
  const transaction = db.transaction([FAILURES_STORE_NAME], 'readonly');
  const store = transaction.objectStore(FAILURES_STORE_NAME);
  const request = store.get(url);

  return new Promise((resolve, reject) => {
    request.onsuccess = () => {
      resolve(sanitizeTagGenerationFailureRecord(request.result));
    };
    request.onerror = () => {
      reject(request.error);
    };
  });
};

export const getAllTagGenerationFailures = async (): Promise<TagGenerationFailure[]> => {
  const db = await initDB();
  const transaction = db.transaction([FAILURES_STORE_NAME], 'readonly');
  const store = transaction.objectStore(FAILURES_STORE_NAME);
  const request = store.getAll();

  return new Promise((resolve, reject) => {
    request.onsuccess = () => {
      resolve(request.result.map(sanitizeTagGenerationFailureRecord).filter(Boolean) as TagGenerationFailure[]);
    };
    request.onerror = () => {
      reject(request.error);
    };
  });
};

export const removeTagGenerationFailure = async (url: string): Promise<void> => {
  const db = await initDB();
  const transaction = db.transaction([FAILURES_STORE_NAME], 'readwrite');
  const store = transaction.objectStore(FAILURES_STORE_NAME);
  store.delete(url);

  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => {
      resolve();
    };
    transaction.onerror = () => {
      reject(transaction.error);
    };
  });
};

export const clearAllTagGenerationFailures = async (): Promise<void> => {
  const db = await initDB();
  const transaction = db.transaction([FAILURES_STORE_NAME], 'readwrite');
  const store = transaction.objectStore(FAILURES_STORE_NAME);
  store.clear();

  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => {
      resolve();
    };
    transaction.onerror = () => {
      reject(transaction.error);
    };
  });
};


// ==================== HTTP Request History ====================

/**
 * 获取所有 HTTP 请求历史记录
 * 按时间戳降序排列（最新的在前）
 */
export const getHttpHistory = async (): Promise<HistoryEntry[]> => {
  const db = await initDB();
  if (!db.objectStoreNames.contains(HTTP_HISTORY_STORE_NAME)) {
    return [];
  }
  const transaction = db.transaction([HTTP_HISTORY_STORE_NAME], 'readonly');
  const store = transaction.objectStore(HTTP_HISTORY_STORE_NAME);
  const request = store.getAll();

  return new Promise((resolve, reject) => {
    request.onsuccess = () => {
      resolve(sanitizeHttpHistoryEntries(request.result, Number.MAX_SAFE_INTEGER));
    };
    request.onerror = () => {
      reject(request.error);
    };
  });
};

/**
 * 添加 HTTP 请求历史记录
 * 如果超过最大数量限制，自动删除最旧的记录
 */
export const addHttpHistoryEntry = async (entry: HistoryEntry): Promise<void> => {
  const sanitizedEntry = sanitizeHttpHistoryEntry(entry);
  if (!sanitizedEntry) {
    logger.warn('Skipping invalid HTTP history entry');
    return;
  }

  const db = await initDB();
  const transaction = db.transaction([HTTP_HISTORY_STORE_NAME], 'readwrite');
  const store = transaction.objectStore(HTTP_HISTORY_STORE_NAME);
  
  // 添加新记录
  store.put(sanitizedEntry);

  return new Promise((resolve, reject) => {
    transaction.oncomplete = async () => {
      // 检查并清理超出限制的记录
      try {
        await trimHttpHistory(10);
        resolve();
      } catch (error) {
        logger.error('Failed to trim HTTP history', error);
        resolve(); // 即使清理失败也不影响添加操作
      }
    };
    transaction.onerror = () => {
      reject(transaction.error);
    };
  });
};

/**
 * 删除指定的 HTTP 请求历史记录
 */
export const removeHttpHistoryEntry = async (id: string): Promise<void> => {
  const db = await initDB();
  const transaction = db.transaction([HTTP_HISTORY_STORE_NAME], 'readwrite');
  const store = transaction.objectStore(HTTP_HISTORY_STORE_NAME);
  store.delete(id);

  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => {
      resolve();
    };
    transaction.onerror = () => {
      reject(transaction.error);
    };
  });
};

/**
 * 清空所有 HTTP 请求历史记录
 */
export const clearHttpHistory = async (): Promise<void> => {
  const db = await initDB();
  if (!db.objectStoreNames.contains(HTTP_HISTORY_STORE_NAME)) {
    return;
  }
  const transaction = db.transaction([HTTP_HISTORY_STORE_NAME], 'readwrite');
  const store = transaction.objectStore(HTTP_HISTORY_STORE_NAME);
  store.clear();

  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => {
      resolve();
    };
    transaction.onerror = () => {
      reject(transaction.error);
    };
  });
};

/**
 * 清理超出限制的历史记录
 * 保留最近的 maxEntries 条记录
 */
const trimHttpHistory = async (maxEntries: number): Promise<void> => {
  const entries = await getHttpHistory();
  
  if (entries.length <= maxEntries) {
    return;
  }
  
  // 获取需要删除的记录（最旧的）
  const entriesToDelete = entries.slice(maxEntries);
  
  const db = await initDB();
  const transaction = db.transaction([HTTP_HISTORY_STORE_NAME], 'readwrite');
  const store = transaction.objectStore(HTTP_HISTORY_STORE_NAME);
  
  for (const entry of entriesToDelete) {
    store.delete(entry.id);
  }

  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => {
      resolve();
    };
    transaction.onerror = () => {
      reject(transaction.error);
    };
  });
};


// ==================== Subscription Management ====================

/**
 * 获取所有订阅
 */
export const getAllSubscriptions = async (): Promise<Subscription[]> => {
  const db = await initDB();
  if (!db.objectStoreNames.contains(SUBSCRIPTIONS_STORE_NAME)) {
    return [];
  }
  const transaction = db.transaction([SUBSCRIPTIONS_STORE_NAME], 'readonly');
  const store = transaction.objectStore(SUBSCRIPTIONS_STORE_NAME);
  const request = store.getAll();

  return new Promise((resolve, reject) => {
    request.onsuccess = () => {
      resolve(request.result);
    };
    request.onerror = () => {
      reject(request.error);
    };
  });
};

/**
 * 根据 ID 获取订阅
 */
export const getSubscriptionById = async (id: string): Promise<Subscription | null> => {
  const db = await initDB();
  if (!db.objectStoreNames.contains(SUBSCRIPTIONS_STORE_NAME)) {
    return null;
  }
  const transaction = db.transaction([SUBSCRIPTIONS_STORE_NAME], 'readonly');
  const store = transaction.objectStore(SUBSCRIPTIONS_STORE_NAME);
  const request = store.get(id);

  return new Promise((resolve, reject) => {
    request.onsuccess = () => {
      resolve(request.result || null);
    };
    request.onerror = () => {
      reject(request.error);
    };
  });
};

/**
 * 添加订阅
 */
export const addSubscription = async (subscription: Subscription): Promise<Subscription> => {
  const db = await initDB();
  const transaction = db.transaction([SUBSCRIPTIONS_STORE_NAME], 'readwrite');
  const store = transaction.objectStore(SUBSCRIPTIONS_STORE_NAME);
  store.put(subscription);

  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => {
      resolve(subscription);
    };
    transaction.onerror = () => {
      reject(transaction.error);
    };
  });
};

/**
 * 更新订阅
 */
export const updateSubscription = async (subscription: Subscription): Promise<Subscription> => {
  const db = await initDB();
  const transaction = db.transaction([SUBSCRIPTIONS_STORE_NAME], 'readwrite');
  const store = transaction.objectStore(SUBSCRIPTIONS_STORE_NAME);
  store.put(subscription);

  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => {
      resolve(subscription);
    };
    transaction.onerror = () => {
      reject(transaction.error);
    };
  });
};

/**
 * 删除订阅
 */
export const deleteSubscription = async (id: string): Promise<void> => {
  const db = await initDB();
  const transaction = db.transaction([SUBSCRIPTIONS_STORE_NAME], 'readwrite');
  const store = transaction.objectStore(SUBSCRIPTIONS_STORE_NAME);
  store.delete(id);

  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => {
      resolve();
    };
    transaction.onerror = () => {
      reject(transaction.error);
    };
  });
};

/**
 * 清空所有订阅
 */
export const clearAllSubscriptions = async (): Promise<void> => {
  const db = await initDB();
  if (!db.objectStoreNames.contains(SUBSCRIPTIONS_STORE_NAME)) {
    return;
  }
  const transaction = db.transaction([SUBSCRIPTIONS_STORE_NAME], 'readwrite');
  const store = transaction.objectStore(SUBSCRIPTIONS_STORE_NAME);
  store.clear();

  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => {
      resolve();
    };
    transaction.onerror = () => {
      reject(transaction.error);
    };
  });
};

/**
 * 批量添加订阅
 */
export const batchAddSubscriptions = async (subscriptions: Subscription[]): Promise<void> => {
  const db = await initDB();
  const transaction = db.transaction([SUBSCRIPTIONS_STORE_NAME], 'readwrite');
  const store = transaction.objectStore(SUBSCRIPTIONS_STORE_NAME);
  
  subscriptions.forEach(subscription => {
    store.put(subscription);
  });

  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => {
      resolve();
    };
    transaction.onerror = () => {
      reject(transaction.error);
    };
  });
};

// ==================== Subscription Settings ====================

type SubscriptionSettingKey = 'settings';

type SubscriptionSettingRecord<T> = {
  key: SubscriptionSettingKey;
  value: T;
};

/**
 * 获取订阅设置
 */
export const getSubscriptionSettings = async (): Promise<SubscriptionSettings> => {
  const db = await initDB();
  if (!db.objectStoreNames.contains(SUBSCRIPTION_SETTINGS_STORE_NAME)) {
    return DEFAULT_SUBSCRIPTION_SETTINGS;
  }
  const transaction = db.transaction([SUBSCRIPTION_SETTINGS_STORE_NAME], 'readonly');
  const store = transaction.objectStore(SUBSCRIPTION_SETTINGS_STORE_NAME);
  const request = store.get('settings');

  return new Promise((resolve, reject) => {
    request.onsuccess = () => {
      const record = request.result as SubscriptionSettingRecord<SubscriptionSettings> | undefined;
      resolve(record?.value ?? DEFAULT_SUBSCRIPTION_SETTINGS);
    };
    request.onerror = () => reject(request.error);
  });
};

/**
 * 保存订阅设置
 */
export const setSubscriptionSettings = async (settings: SubscriptionSettings): Promise<void> => {
  const db = await initDB();
  const transaction = db.transaction([SUBSCRIPTION_SETTINGS_STORE_NAME], 'readwrite');
  const store = transaction.objectStore(SUBSCRIPTION_SETTINGS_STORE_NAME);
  store.put({ key: 'settings', value: settings });

  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
};

// ==================== Subscription Notification Config ====================

type NotificationConfigKey = 'config';

type NotificationConfigRecord<T> = {
  key: NotificationConfigKey;
  value: T;
};

/**
 * 获取订阅通知配置
 */
export const getSubscriptionNotificationConfig = async (): Promise<SubscriptionNotificationConfig> => {
  const db = await initDB();
  if (!db.objectStoreNames.contains(SUBSCRIPTION_NOTIFICATION_CONFIG_STORE_NAME)) {
    return DEFAULT_NOTIFICATION_CONFIG;
  }
  const transaction = db.transaction([SUBSCRIPTION_NOTIFICATION_CONFIG_STORE_NAME], 'readonly');
  const store = transaction.objectStore(SUBSCRIPTION_NOTIFICATION_CONFIG_STORE_NAME);
  const request = store.get('config');

  return new Promise((resolve, reject) => {
    request.onsuccess = () => {
      const record = request.result as NotificationConfigRecord<SubscriptionNotificationConfig> | undefined;
      resolve(record?.value ?? DEFAULT_NOTIFICATION_CONFIG);
    };
    request.onerror = () => reject(request.error);
  });
};

/**
 * 保存订阅通知配置
 */
export const setSubscriptionNotificationConfig = async (config: SubscriptionNotificationConfig): Promise<void> => {
  const db = await initDB();
  const transaction = db.transaction([SUBSCRIPTION_NOTIFICATION_CONFIG_STORE_NAME], 'readwrite');
  const store = transaction.objectStore(SUBSCRIPTION_NOTIFICATION_CONFIG_STORE_NAME);
  store.put({ key: 'config', value: config });

  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
};
