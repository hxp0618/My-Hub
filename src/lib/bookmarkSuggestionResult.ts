import { sanitizeTagList } from './bookmarkTags';

export interface BookmarkSuggestionResult {
  tags: string[];
  folder: string | null;
}

const isRecord = (value: unknown): value is Record<string, unknown> => (
  !!value && typeof value === 'object' && !Array.isArray(value)
);

export const sanitizeBookmarkSuggestionResult = (value: unknown): BookmarkSuggestionResult => {
  if (!isRecord(value)) {
    return { tags: [], folder: null };
  }

  const folder = typeof value.folder === 'string'
    ? value.folder.trim() || null
    : null;

  return {
    tags: sanitizeTagList(value.tags),
    folder,
  };
};
