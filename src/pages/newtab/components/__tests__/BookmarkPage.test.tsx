import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BookmarkPage } from '../BookmarkPage';

const refreshBookmarks = vi.fn();
const applyBookmarkOrganizationBatch = vi.fn();
let capturedSignal: AbortSignal | undefined;

vi.mock('react-i18next', () => ({
  initReactI18next: {
    type: '3rdParty',
    init: vi.fn(),
  },
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => {
      const translations: Record<string, string> = {
        'bookmarks.aiOrganizeBookmarks': 'AI Organize Bookmarks',
        'common.cancel': 'Cancel',
        'common.confirm': 'Confirm',
        'organizeProgress.confirmAbort': 'Abort the current organization?',
        'organizeProgress.title': 'AI Organize Progress',
        'settings.cardsPerRowOption': `${options?.count} cards`,
      };
      return translations[key] ?? key;
    },
  }),
}));

vi.mock('../../hooks/useBookmarks', () => ({
  useBookmarks: () => ({
    bookmarks: [
      {
        id: '1',
        title: 'Bookmarks Bar',
        children: [
          {
            id: '2',
            parentId: '1',
            title: 'Example',
            url: 'https://example.com',
            dateAdded: 1,
            tags: [],
          },
        ],
      },
    ],
    loading: false,
    deleteBookmark: vi.fn(),
    updateBookmark: vi.fn(),
    updateBookmarkTags: vi.fn(),
    sortOrder: { key: 'dateAdded', order: 'desc' },
    updateSortOrder: vi.fn(),
    createFolder: vi.fn(),
    renameFolder: vi.fn(),
    deleteFolder: vi.fn(),
    moveBookmark: vi.fn(),
    isMultiSelectMode: false,
    selectedBookmarkIds: [],
    toggleMultiSelectMode: vi.fn(),
    toggleBookmarkSelection: vi.fn(),
    moveBookmarks: vi.fn(),
    addTagsToBookmarks: vi.fn(),
    deleteBookmarks: vi.fn(),
    reorderBookmarksInChrome: vi.fn(),
    isBulkUpdating: false,
    refreshBookmarks,
    applyBookmarkOrganization: vi.fn(),
    applyBookmarkOrganizationBatch,
    lastDeletedBookmarkId: null,
    deletedBookmarkContext: null,
    clearLastDeletedBookmarkId: vi.fn(),
  }),
}));

vi.mock('../../../../services/bookmarkOrganizeService', () => ({
  organizeBookmarksBatch: vi.fn(
    async (
      _bookmarks: unknown,
      _allBookmarks: unknown,
      onProgress: (progress: unknown) => void,
      _applyBatch: unknown,
      signal: AbortSignal,
    ) => {
      capturedSignal = signal;
      onProgress({
        currentBatch: 1,
        totalBatches: 1,
        processedCount: 0,
        totalCount: 1,
        currentStatus: 'Processing',
      });
      await new Promise(() => undefined);
    },
  ),
}));

vi.mock('../../../../contexts/ToastContext', () => ({
  useToastContext: () => ({
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
    showToast: vi.fn(),
  }),
}));

vi.mock('../../../../components/BookmarkTree', () => ({
  default: () => <div>Bookmark Tree</div>,
}));

vi.mock('../../../../components/BookmarkFolderTree', () => ({
  BookmarkFolderTree: () => <div>Folder Tree</div>,
}));

vi.mock('../../../../components/SelectionActionBar', () => ({
  SelectionActionBar: () => null,
}));

vi.mock('../../../../components/AutoOrganizeModal', () => ({
  AutoOrganizeModal: () => null,
}));

vi.mock('../../../../components/OrganizeBookmarksModal', () => ({
  OrganizeBookmarksModal: ({ onConfirm }: { onConfirm: (action: 'export' | 'organize') => void }) => (
    <button type="button" onClick={() => onConfirm('organize')}>
      Start Organize
    </button>
  ),
}));

vi.mock('../../../../components/OrganizeProgressModal', () => ({
  OrganizeProgressModal: ({ onClose }: { onClose: () => void }) => (
    <button type="button" onClick={onClose}>
      Close Progress
    </button>
  ),
}));

vi.mock('../../../../components/UnifiedSearchBar', () => ({
  default: () => <input aria-label="Search" />,
}));

vi.mock('../../../../components/SkeletonLoader', () => ({
  BookmarkTreeSkeleton: () => <div>Loading</div>,
}));

vi.mock('../../../../components/FailedBookmarksIndicator', () => ({
  FailedBookmarksIndicator: () => null,
}));

vi.mock('../../../../components/BulkTagRegenerationModal', () => ({
  BulkTagRegenerationModal: () => null,
}));

vi.mock('../../../../components/TagInput', () => ({
  default: () => <div>Tag Input</div>,
}));

vi.mock('../../../../db/indexedDB', () => ({
  getAllBookmarkTags: vi.fn().mockResolvedValue([]),
  getAllTagGenerationFailures: vi.fn().mockResolvedValue([]),
}));

vi.mock('../../../../lib/tagGenerationPrompts', () => ({
  buildTagGenerationPrompt: vi.fn(() => 'system prompt'),
}));

vi.mock('../../../../services/llmService', () => ({
  sendMessage: vi.fn(),
}));

describe('BookmarkPage organize progress confirmation', () => {
  beforeEach(() => {
    localStorage.clear();
    refreshBookmarks.mockClear();
    applyBookmarkOrganizationBatch.mockClear();
    vi.spyOn(console, 'debug').mockImplementation(() => undefined);
    capturedSignal = undefined;
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('uses the app confirmation dialog before aborting AI organization', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(<BookmarkPage />);

    fireEvent.click(screen.getAllByText('more_horiz')[0]);
    fireEvent.click(screen.getByText('AI Organize Bookmarks'));
    fireEvent.click(screen.getByText('Start Organize'));

    await waitFor(() => expect(capturedSignal).toBeDefined());

    fireEvent.click(screen.getByText('Close Progress'));

    expect(confirmSpy).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Abort the current organization?')).toBeInTheDocument();

    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel' }));
    expect(capturedSignal?.aborted).toBe(false);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('Close Progress'));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Confirm' }));

    expect(capturedSignal?.aborted).toBe(true);
    expect(refreshBookmarks).toHaveBeenCalled();
  });

  it('falls back to the default card density when saved density is invalid', () => {
    localStorage.setItem('cardsPerRow', '99');

    render(<BookmarkPage />);

    expect((screen.getByDisplayValue('4 cards') as HTMLSelectElement).value).toBe('4');
  });

  it('keeps the folder sidebar open when saved collapsed state is invalid', () => {
    localStorage.setItem('bookmark-sidebar-collapsed', JSON.stringify('true'));

    render(<BookmarkPage />);

    expect(screen.getByTitle('bookmarks.collapse')).toBeInTheDocument();
  });
});
