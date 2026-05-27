import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { EnhancedBookmark } from '../../../../types/bookmarks';
import { BookmarkHealthIssue } from '../../../../utils/bookmarkHealth';
import { SortOrder } from '../../types';
import { useBookmarkDisplay } from '../useBookmarkDisplay';

const bookmarks: EnhancedBookmark[] = [
  {
    id: '1',
    title: 'Bookmarks Bar',
    syncing: false,
    children: [
      {
        id: '2',
        parentId: '1',
        title: 'Zed Docs',
        url: 'https://zed.dev',
        tags: ['editor'],
        dateAdded: 30,
        dateLastUsed: Date.now(),
        syncing: false,
      },
      {
        id: '3',
        parentId: '1',
        title: 'Alpha API',
        url: 'https://api.example.com',
        tags: [],
        dateAdded: 10,
        syncing: false,
      },
      {
        id: '4',
        parentId: '1',
        title: 'Nested Folder',
        syncing: false,
        children: [
          {
            id: '5',
            parentId: '4',
            title: 'Chrome Tools',
            url: 'https://chrome.example.com',
            tags: ['browser'],
            dateAdded: 20,
            syncing: false,
          },
        ],
      },
    ],
  },
  {
    id: '6',
    title: 'Other Bookmarks',
    syncing: false,
    children: [
      {
        id: '7',
        parentId: '6',
        title: 'Duplicate API',
        url: 'https://api.example.com',
        tags: ['api'],
        dateAdded: 40,
        syncing: false,
      },
    ],
  },
];

const Harness: React.FC<{
  selectedFolderId?: string;
  searchTerm?: string;
  activeHealthIssue?: BookmarkHealthIssue | null;
  sortOrder?: SortOrder;
}> = ({
  selectedFolderId = '1',
  searchTerm = '',
  activeHealthIssue = null,
  sortOrder = { key: 'title', order: 'asc' },
}) => {
  const { selectedFolder, healthReport, bookmarksToDisplay } = useBookmarkDisplay({
    bookmarks,
    selectedFolderId,
    searchTerm,
    activeHealthIssue,
    sortOrder,
  });

  return (
    <div>
      <div data-testid="folder">{selectedFolder?.title}</div>
      <div data-testid="score">{healthReport.score}</div>
      <div data-testid="items">{bookmarksToDisplay.map(item => item.title).join('|')}</div>
    </div>
  );
};

describe('useBookmarkDisplay', () => {
  afterEach(() => {
    cleanup();
  });

  it('flattens selected folder bookmarks and applies the requested sort order', () => {
    render(<Harness sortOrder={{ key: 'dateAdded', order: 'desc' }} />);

    expect(screen.getByTestId('folder')).toHaveTextContent('Bookmarks Bar');
    expect(screen.getByTestId('items')).toHaveTextContent('Zed Docs|Chrome Tools|Alpha API');
  });

  it('searches across title, url, and tags without changing result order', () => {
    render(<Harness searchTerm="api" />);

    expect(screen.getByTestId('items')).toHaveTextContent('Alpha API|Duplicate API');
  });

  it('filters by health issue and sorts the filtered result set', () => {
    render(
      <Harness
        activeHealthIssue="duplicates"
        sortOrder={{ key: 'title', order: 'desc' }}
      />,
    );

    expect(screen.getByTestId('items')).toHaveTextContent('Duplicate API|Alpha API');
  });

  it('returns an empty display list for an unknown folder', () => {
    render(<Harness selectedFolderId="missing" />);

    expect(screen.getByTestId('folder')).toBeEmptyDOMElement();
    expect(screen.getByTestId('items')).toBeEmptyDOMElement();
  });
});
