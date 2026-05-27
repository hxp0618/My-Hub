import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useBulkTagRegeneration } from '../useBulkTagRegeneration';

const mocks = vi.hoisted(() => ({
  getAllTagGenerationFailures: vi.fn(),
  toastError: vi.fn(),
  regenerateAllTags: vi.fn(),
  retryFailedTags: vi.fn(),
  cancel: vi.fn(),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('../../../../contexts/ToastContext', () => ({
  useToastContext: () => ({
    error: mocks.toastError,
  }),
}));

vi.mock('../../../../db/indexedDB', () => ({
  getAllTagGenerationFailures: mocks.getAllTagGenerationFailures,
}));

vi.mock('../../../../services/bulkTagRegenerationService', () => ({
  BulkTagRegenerationService: vi.fn(function () {
    return {
      regenerateAllTags: mocks.regenerateAllTags,
      retryFailedTags: mocks.retryFailedTags,
      cancel: mocks.cancel,
    };
  }),
}));

const HookHarness: React.FC<{ refreshBookmarks: () => void }> = ({ refreshBookmarks }) => {
  const {
    failureCount,
    isBulkRegenerationModalOpen,
    bulkRegenerationProgress,
    handleRegenerateAllTags,
    handleRetryFailedTags,
    handleCancelBulkRegeneration,
    handleCompleteBulkRegeneration,
  } = useBulkTagRegeneration(refreshBookmarks);

  return (
    <div>
      <div data-testid="failure-count">{failureCount}</div>
      <div data-testid="modal-open">{String(isBulkRegenerationModalOpen)}</div>
      <div data-testid="processed">{bulkRegenerationProgress.processed}</div>
      <button type="button" onClick={handleRegenerateAllTags}>regenerate</button>
      <button type="button" onClick={handleRetryFailedTags}>retry</button>
      <button type="button" onClick={handleCancelBulkRegeneration}>cancel</button>
      <button type="button" onClick={handleCompleteBulkRegeneration}>complete</button>
    </div>
  );
};

describe('useBulkTagRegeneration', () => {
  beforeEach(() => {
    mocks.getAllTagGenerationFailures.mockResolvedValue([{ id: 'failed-1' }]);
    mocks.regenerateAllTags.mockImplementation(async (onProgress) => {
      onProgress({ total: 1, processed: 1, successful: 1, failed: 0, status: 'completed' });
    });
    mocks.retryFailedTags.mockImplementation(async (onProgress) => {
      onProgress({ total: 1, processed: 1, successful: 1, failed: 0, status: 'completed' });
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('loads failure count and runs full tag regeneration', async () => {
    const refreshBookmarks = vi.fn();
    render(<HookHarness refreshBookmarks={refreshBookmarks} />);

    await waitFor(() => expect(screen.getByTestId('failure-count')).toHaveTextContent('1'));

    mocks.getAllTagGenerationFailures.mockResolvedValue([]);
    fireEvent.click(screen.getByRole('button', { name: 'regenerate' }));

    await waitFor(() => expect(mocks.regenerateAllTags).toHaveBeenCalled());
    await waitFor(() => expect(refreshBookmarks).toHaveBeenCalled());
    expect(screen.getByTestId('modal-open')).toHaveTextContent('true');
    expect(screen.getByTestId('processed')).toHaveTextContent('1');

    fireEvent.click(screen.getByRole('button', { name: 'cancel' }));
    expect(mocks.cancel).toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'complete' }));
    expect(screen.getByTestId('modal-open')).toHaveTextContent('false');
    expect(screen.getByTestId('processed')).toHaveTextContent('0');
  });

  it('runs failed-tag retry through the same progress flow', async () => {
    const refreshBookmarks = vi.fn();
    render(<HookHarness refreshBookmarks={refreshBookmarks} />);

    await waitFor(() => expect(screen.getByTestId('failure-count')).toHaveTextContent('1'));

    fireEvent.click(screen.getByRole('button', { name: 'retry' }));

    await waitFor(() => expect(mocks.retryFailedTags).toHaveBeenCalled());
    await waitFor(() => expect(refreshBookmarks).toHaveBeenCalled());
    expect(screen.getByTestId('modal-open')).toHaveTextContent('true');
  });
});
