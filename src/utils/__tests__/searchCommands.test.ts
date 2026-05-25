import { describe, expect, it } from 'vitest';
import {
  bookmarkMatchesSearchCommand,
  historyItemMatchesSearchCommand,
  parseGlobalSearchCommand,
} from '../searchCommands';
import type { EnhancedBookmark } from '../../types/bookmarks';

const bookmark = (overrides: Partial<EnhancedBookmark>): EnhancedBookmark => ({
  id: '1',
  title: 'Example Docs',
  url: 'https://docs.example.com/guide',
  tags: ['AI', 'Reference'],
  syncing: false,
  ...overrides,
});

describe('search command parsing', () => {
  it('parses supported prefixes case-insensitively', () => {
    expect(parseGlobalSearchCommand(' TOOL:json ')).toEqual({
      type: 'tool',
      rawQuery: 'json',
      query: 'json',
    });
  });

  it('parses action: as a command prefix', () => {
    expect(parseGlobalSearchCommand('action:settings')).toEqual({
      type: 'action',
      rawQuery: 'settings',
      query: 'settings',
    });
  });

  it('keeps unknown prefixes as default search text', () => {
    expect(parseGlobalSearchCommand('https://example.com')).toEqual({
      type: 'default',
      rawQuery: 'https://example.com',
      query: 'https://example.com',
    });
  });
});

describe('bookmark command matching', () => {
  it('matches tag: against bookmark tags only', () => {
    expect(bookmarkMatchesSearchCommand(bookmark({ title: 'No Match' }), parseGlobalSearchCommand('tag:ai'))).toBe(true);
    expect(bookmarkMatchesSearchCommand(bookmark({ tags: ['work'] }), parseGlobalSearchCommand('tag:ai'))).toBe(false);
  });

  it('matches empty tag: against tagged bookmarks', () => {
    expect(bookmarkMatchesSearchCommand(bookmark({ tags: ['work'] }), parseGlobalSearchCommand('tag:'))).toBe(true);
    expect(bookmarkMatchesSearchCommand(bookmark({ tags: [] }), parseGlobalSearchCommand('tag:'))).toBe(false);
  });

  it('matches url: against URLs only', () => {
    expect(bookmarkMatchesSearchCommand(bookmark({ url: 'https://github.com/openai/codex' }), parseGlobalSearchCommand('url:github'))).toBe(true);
    expect(bookmarkMatchesSearchCommand(bookmark({ title: 'github', url: 'https://example.com' }), parseGlobalSearchCommand('url:github'))).toBe(false);
  });
});

describe('history command matching', () => {
  it('filters url: history results by URL', () => {
    const item: chrome.history.HistoryItem = { id: '1', title: 'GitHub', url: 'https://github.com/openai/codex' };
    expect(historyItemMatchesSearchCommand(item, parseGlobalSearchCommand('url:github'))).toBe(true);
    expect(historyItemMatchesSearchCommand(item, parseGlobalSearchCommand('url:example'))).toBe(false);
  });
});
