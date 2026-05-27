import { describe, expect, it } from 'vitest';
import {
  GeneratedBookmarkTreeParseError,
  parseGeneratedBookmarkTreeResponse,
  sanitizeGeneratedBookmarkTree,
} from '../generatedBookmarkTree';

describe('generated bookmark tree sanitizer', () => {
  it('keeps only valid bookmark ids and clean folder nodes', () => {
    const validBookmarkIds = new Set(['bookmark-1', 'bookmark-2']);

    expect(sanitizeGeneratedBookmarkTree([
      {
        title: ' Work ',
        children: [
          { id: 'bookmark-1', title: 'ignored bookmark title' },
          { id: 'bookmark-1' },
          { id: 'missing-bookmark' },
          { title: '', children: [{ id: 'bookmark-2' }] },
          {
            title: ' Docs ',
            children: [
              { id: 'bookmark-2' },
              { title: 'Empty Child', children: 'bad-children' },
            ],
          },
        ],
      },
      { id: 'bookmark-2' },
      { title: 42, children: [] },
      null,
    ], validBookmarkIds)).toEqual([
      {
        title: 'Work',
        children: [
          { id: 'bookmark-1' },
          {
            title: 'Docs',
            children: [
              { id: 'bookmark-2' },
              { title: 'Empty Child', children: [] },
            ],
          },
        ],
      },
    ]);
  });

  it('deduplicates bookmark ids across nested and top-level nodes', () => {
    const validBookmarkIds = new Set(['bookmark-1', 'bookmark-2']);

    expect(sanitizeGeneratedBookmarkTree([
      { id: 'bookmark-1' },
      {
        title: 'Work',
        children: [
          { id: 'bookmark-1' },
          { id: 'bookmark-2' },
        ],
      },
      { id: 'bookmark-2' },
    ], validBookmarkIds)).toEqual([
      { id: 'bookmark-1' },
      {
        title: 'Work',
        children: [
          { id: 'bookmark-2' },
        ],
      },
    ]);
  });

  it('falls back to an empty tree for non-array payloads', () => {
    expect(sanitizeGeneratedBookmarkTree({ title: 'Work' }, new Set())).toEqual([]);
  });

  it('parses repaired model output through the same sanitizer', () => {
    const validBookmarkIds = new Set(['bookmark-1']);

    expect(parseGeneratedBookmarkTreeResponse(`
      Here is the plan:
      [
        { title: ' Work ', children: [{ id: 'bookmark-1' }, { id: 'missing' }] }
      ]
    `, validBookmarkIds)).toEqual([
      {
        title: 'Work',
        children: [{ id: 'bookmark-1' }],
      },
    ]);
  });

  it('throws stable parse errors without leaking raw model output', () => {
    expect(() => parseGeneratedBookmarkTreeResponse(
      'raw private model response with https://secret.example.com',
      new Set(['bookmark-1']),
    )).toThrow(GeneratedBookmarkTreeParseError);

    try {
      parseGeneratedBookmarkTreeResponse(
        'raw private model response with https://secret.example.com',
        new Set(['bookmark-1']),
      );
    } catch (error) {
      expect(error).toBeInstanceOf(GeneratedBookmarkTreeParseError);
      expect((error as Error).message).toBe('invalidJson');
      expect((error as Error).message).not.toContain('secret.example.com');
    }
  });

  it('treats sanitized empty trees as a stable empty-tree error', () => {
    try {
      parseGeneratedBookmarkTreeResponse('[{ "id": "missing-bookmark" }]', new Set(['bookmark-1']));
    } catch (error) {
      expect(error).toBeInstanceOf(GeneratedBookmarkTreeParseError);
      expect((error as GeneratedBookmarkTreeParseError).code).toBe('emptyTree');
    }
  });
});
