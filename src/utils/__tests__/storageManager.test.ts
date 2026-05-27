import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  autoSuggestBookmark,
  bookmarkSidebarCollapsed,
  cardsPerRow,
  folderState,
  homeItemOrder,
  language,
  noMoreDisplayed,
  parseCardsPerRowValue,
  sidebarWidth,
  StorageKey,
  storage,
  theme,
  toolsConfig,
  webCombos,
} from '../storageManager';
import type { StorageValues } from '../storageManager';
import { ToolId } from '../../types/tools';

describe('storageManager', () => {
  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('falls back when stored boolean values are not booleans', () => {
    localStorage.setItem(StorageKey.AUTO_SUGGEST_BOOKMARK, JSON.stringify('true'));
    localStorage.setItem(StorageKey.BOOKMARK_SIDEBAR_COLLAPSED, JSON.stringify('true'));

    expect(autoSuggestBookmark.get()).toBe(false);
    expect(bookmarkSidebarCollapsed.get()).toBe(false);
  });

  it('sanitizes home layout settings', () => {
    localStorage.setItem(StorageKey.CARDS_PER_ROW, '7');
    localStorage.setItem(StorageKey.HOME_ITEM_ORDER, JSON.stringify(['https://example.com', 42]));
    localStorage.setItem(StorageKey.SIDEBAR_WIDTH, '999');

    expect(cardsPerRow.get()).toBe(4);
    expect(homeItemOrder.get()).toEqual([]);
    expect(sidebarWidth.get()).toBe(256);

    cardsPerRow.set(5);
    homeItemOrder.set(['https://example.com']);
    sidebarWidth.set(320);

    expect(cardsPerRow.get()).toBe(5);
    expect(homeItemOrder.get()).toEqual(['https://example.com']);
    expect(sidebarWidth.get()).toBe(320);
  });

  it('strictly parses cards-per-row values from UI strings', () => {
    expect(parseCardsPerRowValue('2')).toBe(2);
    expect(parseCardsPerRowValue(' 6 ')).toBe(6);
    expect(parseCardsPerRowValue('4abc')).toBeNull();
    expect(parseCardsPerRowValue('4.5')).toBeNull();
    expect(parseCardsPerRowValue('7')).toBeNull();
    expect(parseCardsPerRowValue(Number.NaN)).toBeNull();
  });

  it('keeps supported themes including eye-care and rejects invalid themes', () => {
    localStorage.setItem(StorageKey.THEME, 'eye-care');
    expect(theme.get()).toBe('eye-care');

    localStorage.setItem(StorageKey.THEME, 'sepia');
    expect(theme.get()).toBe('system');
  });

  it('keeps supported languages and rejects invalid language values', () => {
    localStorage.setItem(StorageKey.LANGUAGE, 'en');
    expect(language.get()).toBe('en');

    localStorage.setItem(StorageKey.LANGUAGE, 'fr');
    expect(language.get()).toBe('zh-CN');
  });

  it('sanitizes web combos and no-more-displayed arrays', () => {
    localStorage.setItem(StorageKey.WEB_COMBOS, JSON.stringify([
      { id: 'combo-1', title: 'Docs', urls: ['https://example.com'] },
      { id: 'bad-combo', title: 'Broken', urls: 'https://example.com' },
      null,
    ]));
    localStorage.setItem(StorageKey.NO_MORE_DISPLAYED, JSON.stringify(['https://a.example', 42]));

    expect(webCombos.get()).toEqual([
      { id: 'combo-1', title: 'Docs', urls: ['https://example.com'] },
    ]);
    expect(noMoreDisplayed.get()).toEqual([]);
  });

  it('filters invalid tool ids from tool configuration', () => {
    localStorage.setItem(StorageKey.TOOLS_CONFIG, JSON.stringify({
      enabledTools: [ToolId.JSON_FORMATTER, 'not-a-tool', ToolId.JSON_FORMATTER],
      toolOrder: [ToolId.BARK_NOTIFIER, 'unknown-tool', ToolId.JSON_FORMATTER, ToolId.BARK_NOTIFIER],
    }));

    expect(toolsConfig.get()).toEqual({
      enabledTools: [ToolId.JSON_FORMATTER],
      toolOrder: [ToolId.BARK_NOTIFIER, ToolId.JSON_FORMATTER],
    });
  });

  it('strips invalid fields from object values', () => {
    localStorage.setItem(StorageKey.LLM_SETTINGS, JSON.stringify({
      selectedProvider: 'openai',
      apiKey: 123,
      prioritizeGeminiNano: true,
    }));

    expect(storage.get(StorageKey.LLM_SETTINGS, {})).toEqual({
      selectedProvider: 'openai',
      prioritizeGeminiNano: true,
    });
  });

  it('normalizes values before writing to localStorage', () => {
    storage.set(
      StorageKey.CARDS_PER_ROW,
      999 as unknown as StorageValues[StorageKey.CARDS_PER_ROW]
    );
    storage.set(StorageKey.THEME, 'sepia' as unknown as StorageValues[StorageKey.THEME]);
    storage.set(StorageKey.WEB_COMBOS, [
      { id: 'combo-1', title: 'Docs', urls: ['https://example.com'] },
      { id: 'bad-combo', title: 'Broken', urls: 'https://example.com' },
    ] as unknown as Array<{ id: string; title: string; urls: string[] }>);

    expect(localStorage.getItem(StorageKey.CARDS_PER_ROW)).toBe('4');
    expect(localStorage.getItem(StorageKey.THEME)).toBe('system');
    expect(JSON.parse(localStorage.getItem(StorageKey.WEB_COMBOS) ?? '[]')).toEqual([
      { id: 'combo-1', title: 'Docs', urls: ['https://example.com'] },
    ]);
  });

  it('does not echo unsupported storage keys in thrown errors', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const rawKey = 'secret-storage-key';

    storage.set(
      rawKey as StorageKey,
      'value' as unknown as StorageValues[StorageKey.THEME]
    );

    const logText = JSON.stringify(errorSpy.mock.calls);
    expect(logText).toContain('Error saving item to localStorage');
    expect(logText).not.toContain(rawKey);
  });

  it('does not log raw folder ids when folder state storage fails', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const rawFolderId = 'folder-secret-id';
    const originalGetItem = localStorage.getItem.bind(localStorage);
    const originalSetItem = localStorage.setItem.bind(localStorage);

    vi.spyOn(Storage.prototype, 'getItem').mockImplementation((key: string) => {
      if (key.includes(rawFolderId)) {
        throw new Error('storage unavailable');
      }
      return originalGetItem(key);
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation((key: string, value: string) => {
      if (key.includes(rawFolderId)) {
        throw new Error('storage unavailable');
      }
      return originalSetItem(key, value);
    });

    expect(storage.getFolderState(rawFolderId)).toBe(true);
    storage.setFolderState(rawFolderId, false);

    const logText = JSON.stringify(errorSpy.mock.calls);
    expect(logText).not.toContain(rawFolderId);
    expect(logText).not.toContain(`bookmark-folder-state-${rawFolderId}`);
  });

  it('uses caller-provided defaults for missing folder state', () => {
    expect(folderState.get('root-folder', true)).toBe(true);
    expect(folderState.get('nested-folder', false)).toBe(false);
  });

  it('migrates legacy folder expansion state to the unified storage key', () => {
    localStorage.setItem('folder-expanded-legacy-folder', 'false');

    expect(folderState.get('legacy-folder', true)).toBe(false);
    expect(localStorage.getItem('bookmark-folder-state-legacy-folder')).toBe('false');
    expect(localStorage.getItem('folder-expanded-legacy-folder')).toBeNull();
  });
});
