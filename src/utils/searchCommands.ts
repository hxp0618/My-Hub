import type { EnhancedBookmark } from '../types/bookmarks';

export type GlobalSearchCommandType = 'default' | 'tool' | 'tag' | 'url' | 'action';

export interface ParsedGlobalSearchCommand {
  type: GlobalSearchCommandType;
  rawQuery: string;
  query: string;
}

const COMMAND_TYPES = new Set<GlobalSearchCommandType>(['tool', 'tag', 'url', 'action']);

export const parseGlobalSearchCommand = (searchTerm: string): ParsedGlobalSearchCommand => {
  const rawQuery = searchTerm.trim();
  const match = rawQuery.match(/^([a-z]+):(.*)$/i);
  const commandType = match?.[1].toLowerCase() as GlobalSearchCommandType | undefined;

  if (commandType && COMMAND_TYPES.has(commandType)) {
    const commandQuery = match?.[2].trim() ?? '';
    return {
      type: commandType,
      rawQuery: commandQuery,
      query: commandQuery.toLowerCase(),
    };
  }

  return {
    type: 'default',
    rawQuery,
    query: rawQuery.toLowerCase(),
  };
};

export const bookmarkMatchesSearchCommand = (
  bookmark: EnhancedBookmark,
  command: ParsedGlobalSearchCommand,
): boolean => {
  const title = bookmark.title.toLowerCase();
  const url = bookmark.url?.toLowerCase() ?? '';
  const tags = bookmark.tags ?? [];

  if (command.type === 'tag') {
    // `tag:` 空查询用于列出已经打过标签的书签。
    return command.query
      ? tags.some(tag => tag.toLowerCase().includes(command.query))
      : tags.length > 0;
  }

  if (command.type === 'url') {
    return !command.query || url.includes(command.query);
  }

  return (
    title.includes(command.query) ||
    url.includes(command.query) ||
    tags.some(tag => tag.toLowerCase().includes(command.query))
  );
};

export const historyItemMatchesSearchCommand = (
  item: chrome.history.HistoryItem,
  command: ParsedGlobalSearchCommand,
): boolean => {
  if (command.type !== 'url') {
    return true;
  }

  const url = item.url?.toLowerCase() ?? '';
  return !command.query || url.includes(command.query);
};
