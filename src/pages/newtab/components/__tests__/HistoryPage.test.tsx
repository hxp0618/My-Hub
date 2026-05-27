import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HistoryPage } from '../HistoryPage';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => {
      const translations: Record<string, string> = {
        'history.title': 'History',
        'history.selectionMode': 'Selection Mode',
        'history.loadMore': 'Load More',
        'settings.cardsPerRowOption': `${options?.count} cards`,
        'search.placeholder': 'Search',
      };
      return translations[key] ?? key;
    },
  }),
}));

vi.mock('../../hooks/useEnhancedHistory', () => ({
  useEnhancedHistory: () => ({
    historyItems: [],
    isLoading: false,
    filters: { search: '', startTime: 0, endTime: 0 },
    setFilters: vi.fn(),
    deleteHistoryByUrl: vi.fn(),
    hasMore: false,
    loadMore: vi.fn(),
    availableDates: [],
  }),
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

vi.mock('../../../../components/DateNavigator', () => ({
  DateNavigator: () => <div>Date Navigator</div>,
}));

vi.mock('../../../../components/SelectionActionBar', () => ({
  SelectionActionBar: () => null,
}));

vi.mock('../../../../components/UnifiedSearchBar', () => ({
  default: () => <input aria-label="Search" />,
}));

vi.mock('../../../../components/SkeletonLoader', () => ({
  HistoryItemSkeleton: () => <div>Loading</div>,
}));

vi.mock('../AddBookmarkForm', () => ({
  default: () => <div>Add Bookmark Form</div>,
}));

vi.mock('../../../../db/indexedDB', () => ({
  getAllBookmarkTags: vi.fn().mockResolvedValue([]),
  addBookmarkTag: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../../../lib/tagGenerationPrompts', () => ({
  buildTagGenerationPrompt: vi.fn(() => 'system prompt'),
}));

vi.mock('../../../../services/llmService', () => ({
  sendMessage: vi.fn(),
}));

describe('HistoryPage card density settings', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('falls back to the default card density when saved density is invalid', () => {
    localStorage.setItem('cardsPerRow', '99');

    render(<HistoryPage />);

    expect((screen.getByDisplayValue('4 cards') as HTMLSelectElement).value).toBe('4');
  });
});
