import { describe, expect, it } from 'vitest';
import { sanitizeBookmarkSuggestionResult } from '../bookmarkSuggestionResult';

describe('bookmark suggestion result sanitizer', () => {
  it('keeps only clean bookmark suggestion fields', () => {
    expect(sanitizeBookmarkSuggestionResult({
      tags: [' dev ', 'dev', '', 123, 'tools'],
      folder: ' Work ',
      extra: 'ignored',
    })).toEqual({
      tags: ['dev', 'tools'],
      folder: 'Work',
    });
  });

  it('falls back for malformed suggestion payloads', () => {
    expect(sanitizeBookmarkSuggestionResult(null)).toEqual({ tags: [], folder: null });
    expect(sanitizeBookmarkSuggestionResult({
      tags: 'dev,tools',
      folder: 42,
    })).toEqual({ tags: [], folder: null });
    expect(sanitizeBookmarkSuggestionResult({
      tags: ['keep'],
      folder: '   ',
    })).toEqual({ tags: ['keep'], folder: null });
  });
});
