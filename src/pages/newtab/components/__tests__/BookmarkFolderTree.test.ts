import { describe, expect, it } from 'vitest';
import { sanitizeDraggedItem } from '../BookmarkFolderTree';

describe('BookmarkFolderTree drag payload', () => {
  it('keeps valid internal bookmark and folder payloads', () => {
    expect(sanitizeDraggedItem({
      type: 'bookmark',
      id: 'bookmark-1',
      parentId: 'folder-1',
      title: 'Docs',
    })).toEqual({
      type: 'bookmark',
      id: 'bookmark-1',
      parentId: 'folder-1',
      title: 'Docs',
    });

    expect(sanitizeDraggedItem({
      type: 'folder',
      id: 'folder-2',
      parentId: null,
    })).toEqual({
      type: 'folder',
      id: 'folder-2',
      parentId: null,
    });
  });

  it('rejects malformed drag payloads before move handlers use them', () => {
    expect(sanitizeDraggedItem(null)).toBeNull();
    expect(sanitizeDraggedItem({ type: 'tab', id: '1', parentId: null })).toBeNull();
    expect(sanitizeDraggedItem({ type: 'bookmark', id: '', parentId: null })).toBeNull();
    expect(sanitizeDraggedItem({ type: 'bookmark', id: '1', parentId: 42 })).toBeNull();
  });

  it('drops optional title when it is not a string', () => {
    expect(sanitizeDraggedItem({
      type: 'bookmark',
      id: 'bookmark-1',
      parentId: null,
      title: { text: 'Docs' },
    })).toEqual({
      type: 'bookmark',
      id: 'bookmark-1',
      parentId: null,
    });
  });
});
