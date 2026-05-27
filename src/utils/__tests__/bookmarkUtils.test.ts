import { describe, expect, it } from 'vitest';
import { simplifyBookmarkTree } from '../bookmarkUtils';

describe('bookmarkUtils', () => {
  it('simplifies bookmark tree to folders only', () => {
    const nodes: chrome.bookmarks.BookmarkTreeNode[] = [
      {
        id: '1',
        title: 'Bookmarks Bar',
        syncing: false,
        children: [
          {
            id: 'bookmark-1',
            title: 'Example',
            url: 'https://example.com',
            syncing: false,
          },
          {
            id: 'folder-1',
            title: 'Work',
            syncing: false,
            children: [
              {
                id: 'bookmark-2',
                title: 'Docs',
                url: 'https://docs.example.com',
                syncing: false,
              },
              {
                id: 'folder-2',
                title: 'Projects',
                syncing: false,
                children: [],
              },
            ],
          },
        ],
      },
    ];

    expect(simplifyBookmarkTree(nodes)).toEqual([
      {
        title: 'Bookmarks Bar',
        children: [
          {
            title: 'Work',
            children: [
              {
                title: 'Projects',
              },
            ],
          },
        ],
      },
    ]);
  });
});
