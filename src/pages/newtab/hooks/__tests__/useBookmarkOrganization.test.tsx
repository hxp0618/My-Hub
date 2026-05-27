import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useBookmarkOrganization } from '../useBookmarkOrganization';
import { EnhancedBookmark } from '../../../../types/bookmarks';

const mocks = vi.hoisted(() => ({
  exportBookmarksToHTML: vi.fn(),
  organizeBookmarksBatch: vi.fn(),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('../../../../lib/bookmarkExport', () => ({
  exportBookmarksToHTML: mocks.exportBookmarksToHTML,
}));

vi.mock('../../../../services/bookmarkOrganizeService', () => ({
  organizeBookmarksBatch: mocks.organizeBookmarksBatch,
}));

const bookmarks: EnhancedBookmark[] = [
  {
    id: '1',
    title: 'Bookmarks Bar',
    syncing: false,
    children: [
      {
        id: '2',
        parentId: '1',
        title: 'Example',
        url: 'https://example.com',
        syncing: false,
      },
    ],
  },
];

const HookHarness: React.FC<{
  applyBatch: () => Promise<void>;
  refreshBookmarks: () => Promise<void>;
}> = ({ applyBatch, refreshBookmarks }) => {
  const {
    isOrganizeModalOpen,
    isOrganizeProgressModalOpen,
    organizeProgress,
    isOrganizeAbortConfirmOpen,
    openOrganizeModal,
    closeOrganizeModal,
    handleOrganizeConfirm,
    handleOrganizeProgressClose,
    handleConfirmOrganizeAbort,
    closeOrganizeAbortConfirm,
  } = useBookmarkOrganization({
    bookmarks,
    applyBookmarkOrganizationBatch: applyBatch,
    refreshBookmarks,
  });

  return (
    <div>
      <div data-testid="modal-open">{String(isOrganizeModalOpen)}</div>
      <div data-testid="progress-open">{String(isOrganizeProgressModalOpen)}</div>
      <div data-testid="abort-open">{String(isOrganizeAbortConfirmOpen)}</div>
      <div data-testid="status">{organizeProgress.currentStatus}</div>
      <button type="button" onClick={openOrganizeModal}>open</button>
      <button type="button" onClick={closeOrganizeModal}>close</button>
      <button type="button" onClick={() => void handleOrganizeConfirm('export')}>export</button>
      <button type="button" onClick={() => void handleOrganizeConfirm('organize')}>organize</button>
      <button type="button" onClick={handleOrganizeProgressClose}>close-progress</button>
      <button type="button" onClick={closeOrganizeAbortConfirm}>cancel-abort</button>
      <button type="button" onClick={handleConfirmOrganizeAbort}>confirm-abort</button>
    </div>
  );
};

describe('useBookmarkOrganization', () => {
  beforeEach(() => {
    vi.spyOn(console, 'debug').mockImplementation(() => undefined);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    mocks.organizeBookmarksBatch.mockImplementation(async (
      _bookmarks,
      _allBookmarks,
      onProgress,
    ) => {
      onProgress({
        currentBatch: 1,
        totalBatches: 1,
        processedCount: 1,
        totalCount: 1,
        currentStatus: 'Processing',
      });
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it('opens, closes, and exports bookmarks', () => {
    render(<HookHarness applyBatch={vi.fn()} refreshBookmarks={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'open' }));
    expect(screen.getByTestId('modal-open')).toHaveTextContent('true');

    fireEvent.click(screen.getByRole('button', { name: 'close' }));
    expect(screen.getByTestId('modal-open')).toHaveTextContent('false');

    fireEvent.click(screen.getByRole('button', { name: 'export' }));
    expect(mocks.exportBookmarksToHTML).toHaveBeenCalledWith(bookmarks);
  });

  it('runs organization and marks completion when not aborted', async () => {
    const refreshBookmarks = vi.fn().mockResolvedValue(undefined);
    render(<HookHarness applyBatch={vi.fn()} refreshBookmarks={refreshBookmarks} />);

    fireEvent.click(screen.getByRole('button', { name: 'organize' }));

    await waitFor(() => expect(mocks.organizeBookmarksBatch).toHaveBeenCalled());
    await waitFor(() => expect(refreshBookmarks).toHaveBeenCalled());
    expect(screen.getByTestId('progress-open')).toHaveTextContent('true');
    expect(screen.getByTestId('status')).toHaveTextContent('organizeProgress.done');
  });

  it('asks for confirmation before closing an active organization run', async () => {
    let capturedSignal: AbortSignal | undefined;
    mocks.organizeBookmarksBatch.mockImplementation(async (
      _bookmarks,
      _allBookmarks,
      onProgress,
      _applyBatch,
      signal,
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
    });

    render(<HookHarness applyBatch={vi.fn()} refreshBookmarks={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'organize' }));
    await waitFor(() => expect(capturedSignal).toBeDefined());

    fireEvent.click(screen.getByRole('button', { name: 'close-progress' }));
    expect(screen.getByTestId('abort-open')).toHaveTextContent('true');

    fireEvent.click(screen.getByRole('button', { name: 'cancel-abort' }));
    expect(capturedSignal?.aborted).toBe(false);
    expect(screen.getByTestId('abort-open')).toHaveTextContent('false');

    fireEvent.click(screen.getByRole('button', { name: 'close-progress' }));
    fireEvent.click(screen.getByRole('button', { name: 'confirm-abort' }));
    expect(capturedSignal?.aborted).toBe(true);
    expect(screen.getByTestId('progress-open')).toHaveTextContent('false');
  });

  it('shows a stable localized error when organization fails', async () => {
    mocks.organizeBookmarksBatch.mockRejectedValueOnce(new Error('raw model failure'));

    render(<HookHarness applyBatch={vi.fn()} refreshBookmarks={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'organize' }));

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('organizeAiModal.applyError');
    });
    expect(screen.queryByText(/raw model failure/)).not.toBeInTheDocument();
  });
});
