import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useGlobalSearch } from '../useGlobalSearch';

const mocks = vi.hoisted(() => ({
  getBookmarkSnapshot: vi.fn(),
}));

vi.mock('../../utils/bookmarkSnapshot', () => ({
  getBookmarkSnapshot: mocks.getBookmarkSnapshot,
}));

vi.mock('../../i18n', () => ({
  default: { t: (key: string) => key },
}));

describe('useGlobalSearch demand loading', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    mocks.getBookmarkSnapshot.mockReset().mockResolvedValue({ bookmarks: [] });
    vi.stubGlobal('chrome', {
      history: { search: vi.fn().mockResolvedValue([]) },
    });
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('does not read bookmarks or history while the search field is empty', async () => {
    const { result } = renderHook(() => useGlobalSearch(''));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });

    expect(result.current.loading).toBe(false);
    expect(mocks.getBookmarkSnapshot).not.toHaveBeenCalled();
    expect(chrome.history.search).not.toHaveBeenCalled();
  });

  it('loads bookmarks only after a real search starts', async () => {
    renderHook(() => useGlobalSearch('example'));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(350);
    });
    await waitFor(() => expect(mocks.getBookmarkSnapshot).toHaveBeenCalledTimes(1));
  });
});
