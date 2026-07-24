import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useMomentInHistory } from '../useMomentInHistory';

const mocks = vi.hoisted(() => ({
  getBookmarkSnapshot: vi.fn(),
}));

vi.mock('../../../../utils/bookmarkSnapshot', () => ({
  getBookmarkSnapshot: mocks.getBookmarkSnapshot,
}));

vi.mock('react-i18next', () => ({
  useTranslation: (() => {
    const t = (key: string, values?: { start?: number; end?: number }) => (
      key === 'home.timeRangeFormat' ? `${values?.start}:00-${values?.end}:00` : key
    );
    return () => ({ t });
  })(),
}));

const createBookmarkEvent = () => ({
  addListener: vi.fn(),
  removeListener: vi.fn(),
});

describe('useMomentInHistory cache', () => {
  const historySearch = vi.fn();

  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date(2026, 6, 23, 18, 0, 0));
    historySearch.mockReset().mockResolvedValue([{
      id: 'history-1',
      url: 'https://example.com',
      title: 'Example',
      lastVisitTime: Date.now(),
    }]);
    mocks.getBookmarkSnapshot.mockReset().mockResolvedValue({
      bookmarks: [],
      urls: new Set(['https://example.com']),
      bookmarkMap: new Map([['https://example.com', { id: 'bookmark-1', tags: ['work'] }]]),
    });
    vi.stubGlobal('chrome', {
      history: { search: historySearch },
      bookmarks: {
        onChanged: createBookmarkEvent(),
        onCreated: createBookmarkEvent(),
        onMoved: createBookmarkEvent(),
        onRemoved: createBookmarkEvent(),
      },
    });
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('reuses the hourly cache instead of repeating fourteen history queries', async () => {
    const first = renderHook(() => useMomentInHistory());
    await waitFor(() => expect(historySearch).toHaveBeenCalledTimes(14));
    await waitFor(() => expect(first.result.current.recommendations).toHaveLength(1));
    first.unmount();

    const second = renderHook(() => useMomentInHistory());
    await waitFor(() => expect(second.result.current.recommendations).toHaveLength(1));

    expect(historySearch).toHaveBeenCalledTimes(14);
    expect(mocks.getBookmarkSnapshot).toHaveBeenCalledTimes(1);
  });

  it('bypasses both caches when the user refreshes manually', async () => {
    const { result } = renderHook(() => useMomentInHistory());
    await waitFor(() => expect(historySearch).toHaveBeenCalledTimes(14));

    await act(async () => {
      await result.current.refreshRecommendations();
    });

    expect(historySearch).toHaveBeenCalledTimes(28);
    expect(mocks.getBookmarkSnapshot).toHaveBeenLastCalledWith(true);
  });
});
