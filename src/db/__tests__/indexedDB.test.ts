import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  closeDB,
  getHttpHistory,
  getTagGenerationFailure,
  getAllTagGenerationFailures,
  getLastSelectedTool,
  getToolConfig,
  getToolUsageCounts,
  initDB,
  migrateLegacyToolSettings,
  addHttpHistoryEntry,
  addTagGenerationFailure,
  setToolConfig,
  setToolUsageCounts,
} from '../indexedDB';
import { DEFAULT_TOOL_CONFIG, ToolId } from '../../types/tools';

const deleteTestDatabase = () => new Promise<void>((resolve, reject) => {
  const request = indexedDB.deleteDatabase('ChromeHistoryDB');
  request.onsuccess = () => resolve();
  request.onerror = () => reject(request.error);
  request.onblocked = () => reject(new Error('IndexedDB deletion was blocked'));
});

describe('indexedDB tool settings migration', () => {
  beforeEach(async () => {
    closeDB();
    await deleteTestDatabase();
    localStorage.clear();
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    closeDB();
    await deleteTestDatabase();
    localStorage.clear();
  });

  it('migrates sanitized legacy tool settings and clears legacy keys', async () => {
    localStorage.setItem('tools_config', JSON.stringify({
      enabledTools: [ToolId.JSON_FORMATTER, 'unknown-tool', ToolId.JSON_FORMATTER, ToolId.BARK_NOTIFIER],
      toolOrder: [ToolId.BARK_NOTIFIER, 'bad-order', ToolId.JSON_FORMATTER, ToolId.BARK_NOTIFIER],
    }));
    localStorage.setItem('last_selected_tool', ToolId.HTTP_URL_TESTER);
    localStorage.setItem('tool_usage_count', JSON.stringify({
      [ToolId.JSON_FORMATTER]: 2,
      [ToolId.HTTP_URL_TESTER]: 0,
      [ToolId.BARK_NOTIFIER]: -1,
      'unknown-tool': 9,
    }));

    await migrateLegacyToolSettings();

    expect(await getToolConfig()).toEqual({
      enabledTools: [ToolId.JSON_FORMATTER, ToolId.BARK_NOTIFIER],
      toolOrder: [ToolId.BARK_NOTIFIER, ToolId.JSON_FORMATTER],
    });
    expect(await getLastSelectedTool()).toBe(ToolId.HTTP_URL_TESTER);
    expect(await getToolUsageCounts()).toEqual({
      [ToolId.JSON_FORMATTER]: 2,
      [ToolId.HTTP_URL_TESTER]: 0,
    });
    expect(localStorage.getItem('tools_config')).toBeNull();
    expect(localStorage.getItem('last_selected_tool')).toBeNull();
    expect(localStorage.getItem('tool_usage_count')).toBeNull();
  });

  it('ignores invalid legacy JSON without blocking other settings', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    localStorage.setItem('tools_config', '{bad-json');
    localStorage.setItem('last_selected_tool', ToolId.PASSWORD_GENERATOR);
    localStorage.setItem('tool_usage_count', JSON.stringify({
      [ToolId.PASSWORD_GENERATOR]: 4,
    }));

    await migrateLegacyToolSettings();

    expect(await getToolConfig()).toEqual(DEFAULT_TOOL_CONFIG);
    expect(await getLastSelectedTool()).toBe(ToolId.PASSWORD_GENERATOR);
    expect(await getToolUsageCounts()).toEqual({
      [ToolId.PASSWORD_GENERATOR]: 4,
    });
    expect(localStorage.getItem('tools_config')).toBeNull();
    expect(localStorage.getItem('last_selected_tool')).toBeNull();
    expect(localStorage.getItem('tool_usage_count')).toBeNull();
    expect(warnSpy).toHaveBeenCalled();
  });

  it('keeps existing indexedDB config while migrating other legacy settings', async () => {
    await setToolConfig({ enabledTools: [ToolId.JSON_FORMATTER] });
    localStorage.setItem('tools_config', JSON.stringify({
      enabledTools: [ToolId.BARK_NOTIFIER],
    }));
    localStorage.setItem('last_selected_tool', ToolId.BARK_NOTIFIER);
    localStorage.setItem('tool_usage_count', JSON.stringify({
      [ToolId.BARK_NOTIFIER]: 1,
    }));

    await migrateLegacyToolSettings();

    expect(await getToolConfig()).toEqual({ enabledTools: [ToolId.JSON_FORMATTER] });
    expect(await getLastSelectedTool()).toBe(ToolId.BARK_NOTIFIER);
    expect(await getToolUsageCounts()).toEqual({ [ToolId.BARK_NOTIFIER]: 1 });
    expect(localStorage.getItem('tools_config')).toBeNull();
  });

  it('sanitizes damaged indexedDB tool settings on read', async () => {
    const db = await initDB();
    const transaction = db.transaction(['tool_settings'], 'readwrite');
    const store = transaction.objectStore('tool_settings');
    store.put({
      key: 'config',
      value: {
        enabledTools: [ToolId.JSON_FORMATTER, 'bad-tool', ToolId.JSON_FORMATTER],
        toolOrder: [ToolId.BARK_NOTIFIER, 42, ToolId.JSON_FORMATTER],
      },
    });
    store.put({ key: 'last_selected_tool', value: 'bad-tool' });
    store.put({
      key: 'tool_usage_count',
      value: {
        [ToolId.JSON_FORMATTER]: 2,
        [ToolId.BARK_NOTIFIER]: -1,
        unknown: 3,
      },
    });
    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });

    expect(await getToolConfig()).toEqual({
      enabledTools: [ToolId.JSON_FORMATTER],
      toolOrder: [ToolId.BARK_NOTIFIER, ToolId.JSON_FORMATTER],
    });
    expect(await getLastSelectedTool()).toBeNull();
    expect(await getToolUsageCounts()).toEqual({
      [ToolId.JSON_FORMATTER]: 2,
    });
  });

  it('sanitizes tool usage counts before writing', async () => {
    await setToolUsageCounts({
      [ToolId.JSON_FORMATTER]: 1,
      [ToolId.HTTP_URL_TESTER]: 1.5,
      [ToolId.BARK_NOTIFIER]: -1,
      unknown: 3,
    });

    expect(await getToolUsageCounts()).toEqual({
      [ToolId.JSON_FORMATTER]: 1,
    });
  });
});

describe('indexedDB HTTP history sanitation', () => {
  beforeEach(async () => {
    closeDB();
    await deleteTestDatabase();
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    closeDB();
    await deleteTestDatabase();
  });

  it('filters damaged HTTP history entries when reading from IndexedDB', async () => {
    const db = await initDB();
    const transaction = db.transaction(['http_request_history'], 'readwrite');
    const store = transaction.objectStore('http_request_history');
    store.put({
      id: 'valid',
      timestamp: 200,
      request: {
        url: 'https://example.com',
        method: 'GET',
        headers: [{ key: 'Accept', value: 'application/json', enabled: true }],
        body: '',
      },
    });
    store.put({
      id: 'bad',
      timestamp: 300,
      request: {
        url: 'https://example.com',
        method: 'OPTIONS',
        headers: [],
        body: '',
      },
    });
    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });

    expect(await getHttpHistory()).toEqual([
      {
        id: 'valid',
        timestamp: 200,
        request: {
          url: 'https://example.com',
          method: 'GET',
          headers: [{ key: 'Accept', value: 'application/json', enabled: true }],
          body: '',
        },
      },
    ]);
  });

  it('skips invalid HTTP history entries before writing', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    await addHttpHistoryEntry({
      id: 'bad',
      timestamp: Number.NaN,
      request: {
        url: 'https://example.com',
        method: 'GET',
        headers: [],
        body: '',
      },
    });

    expect(await getHttpHistory()).toEqual([]);
    expect(warnSpy).toHaveBeenCalled();
  });
});

describe('indexedDB tag generation failure sanitation', () => {
  beforeEach(async () => {
    closeDB();
    await deleteTestDatabase();
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    closeDB();
    await deleteTestDatabase();
  });

  it('normalizes legacy raw failure reasons on write and read', async () => {
    const legacyFailure = {
      url: 'https://example.com',
      bookmarkId: 'bookmark-1',
      failureReason: 'raw provider secret detail',
      failureTimestamp: 100,
      retryCount: 1,
    } as unknown as Parameters<typeof addTagGenerationFailure>[0];

    await addTagGenerationFailure(legacyFailure);

    expect(await getTagGenerationFailure('https://example.com')).toEqual({
      url: 'https://example.com',
      bookmarkId: 'bookmark-1',
      failureReason: 'generationFailed',
      failureTimestamp: 100,
      retryCount: 1,
    });
  });

  it('normalizes raw legacy records already stored in IndexedDB', async () => {
    const db = await initDB();
    const transaction = db.transaction(['tag_generation_failures'], 'readwrite');
    const store = transaction.objectStore('tag_generation_failures');
    store.put({
      url: 'https://legacy.example.com',
      bookmarkId: 'bookmark-legacy',
      failureReason: 'raw parser stack with bookmark context',
      failureTimestamp: 200,
      retryCount: 2,
    });
    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });

    expect(await getAllTagGenerationFailures()).toEqual([
      {
        url: 'https://legacy.example.com',
        bookmarkId: 'bookmark-legacy',
        failureReason: 'generationFailed',
        failureTimestamp: 200,
        retryCount: 2,
      },
    ]);
  });
});
