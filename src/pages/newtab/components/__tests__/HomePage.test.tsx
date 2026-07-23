import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ToolId } from '../../../../types/tools';
import type { SearchResultItem } from '../../../../types/search';
import { HomePage } from '../HomePage';

const globalSearchState = vi.hoisted(() => ({
  value: { results: [] as SearchResultItem[], loading: false },
}));

vi.mock('@dnd-kit/core', () => ({
  DndContext: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  closestCenter: vi.fn(),
  KeyboardSensor: vi.fn(),
  PointerSensor: vi.fn(),
  useSensor: vi.fn(),
  useSensors: vi.fn(() => []),
}));

vi.mock('@dnd-kit/sortable', () => ({
  SortableContext: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  arrayMove: vi.fn(),
  rectSortingStrategy: vi.fn(),
  sortableKeyboardCoordinates: vi.fn(),
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    transition: undefined,
    isDragging: false,
  }),
}));

vi.mock('@dnd-kit/utilities', () => ({
  CSS: {
    Transform: {
      toString: () => '',
    },
  },
}));

vi.mock('react-i18next', () => ({
  initReactI18next: {
    type: '3rdParty',
    init: vi.fn(),
  },
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => {
      const translations: Record<string, string> = {
        'actions.delete': 'Delete',
        'actions.edit': 'Edit',
        'common.cancel': 'Cancel',
        'common.delete': 'Delete',
        'home.deleteWebComboConfirm': 'Delete this web combo?',
        'home.linksCount': `${options?.count} links`,
        'home.webCombos': 'Web Combos',
        'search.placeholder': 'Search',
      };
      return translations[key] ?? key;
    },
  }),
}));

vi.mock('../../../../hooks/useGlobalSearch', () => ({
  useGlobalSearch: () => globalSearchState.value,
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

vi.mock('../../../../components/UnifiedSearchBar', () => ({
  default: ({
    value,
    onChange,
  }: {
    value: string;
    onChange: (value: string) => void;
  }) => (
    <label>
      Search Bar
      <input
        aria-label="Search Bar Input"
        value={value}
        onChange={event => onChange(event.target.value)}
      />
    </label>
  ),
}));

describe('HomePage web combo delete confirmation', () => {
  beforeEach(() => {
    globalSearchState.value = { results: [], loading: false };
    localStorage.clear();
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        readText: vi.fn().mockResolvedValue(''),
      },
      configurable: true,
    });
    localStorage.setItem('webCombos', JSON.stringify([
      {
        id: 'combo_1',
        title: 'Daily Stack',
        urls: ['https://example.com', 'https://openai.com'],
      },
    ]));
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('uses the app confirmation dialog before deleting a web combo', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(<HomePage recommendations={[]} timeRange="day" />);

    const comboCard = screen.getByText('Daily Stack').closest('.item-card');
    expect(comboCard).toBeTruthy();

    fireEvent.click(within(comboCard as HTMLElement).getByText('more_vert'));
    fireEvent.click(screen.getByText('Delete'));

    expect(confirmSpy).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Delete this web combo?')).toBeInTheDocument();
    expect(screen.getByText('Daily Stack')).toBeInTheDocument();

    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete' }));

    await waitFor(() => {
      expect(screen.queryByText('Daily Stack')).not.toBeInTheDocument();
    });
    expect(JSON.parse(localStorage.getItem('webCombos') ?? '[]')).toEqual([]);
  });

  it('renders with safe defaults when saved home layout data is corrupted', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    localStorage.setItem('webCombos', '{bad-json');
    localStorage.setItem('noMoreDisplayed', JSON.stringify(['https://hidden.example', 42]));
    localStorage.setItem('cardsPerRow', '99');
    localStorage.setItem('homeItemOrder', JSON.stringify(['https://example.com', 42]));

    render(<HomePage recommendations={[]} timeRange="day" />);

    expect(screen.getByText('Search Bar')).toBeInTheDocument();
    expect((screen.getByRole('combobox') as HTMLSelectElement).value).toBe('4');
    expect(screen.queryByText('Daily Stack')).not.toBeInTheDocument();
  });

  it('ignores malformed cards-per-row sync events', async () => {
    render(<HomePage recommendations={[]} timeRange="day" />);

    const cardsSelect = screen.getByRole('combobox') as HTMLSelectElement;
    expect(cardsSelect.value).toBe('4');

    act(() => {
      window.dispatchEvent(new CustomEvent('cardsPerRowChanged', { detail: '5' }));
    });
    await waitFor(() => {
      expect(cardsSelect.value).toBe('5');
    });

    act(() => {
      window.dispatchEvent(new CustomEvent('cardsPerRowChanged', { detail: '5abc' }));
      window.dispatchEvent(new CustomEvent('cardsPerRowChanged', { detail: 9 }));
    });

    await waitFor(() => {
      expect(cardsSelect.value).toBe('5');
    });
  });

  it('opens a smart tool suggestion with a prefilled invocation', () => {
    const onOpenTool = vi.fn();
    globalSearchState.value = {
      loading: false,
      results: [
        {
          type: 'tool-intent',
          intentId: 'json-format',
          toolId: ToolId.JSON_FORMATTER,
          mode: 'format',
          title: 'Format JSON',
          description: 'Format strict JSON with indentation.',
          icon: 'code',
          input: '{"name":"My Hub"}',
          confidence: 0.98,
        },
      ],
    };

    render(<HomePage recommendations={[]} timeRange="day" onOpenTool={onOpenTool} />);

    fireEvent.change(screen.getByLabelText('Search Bar Input'), {
      target: { value: '{"name":"My Hub"}' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Format JSON/ }));

    expect(onOpenTool).toHaveBeenCalledWith(
      ToolId.JSON_FORMATTER,
      expect.objectContaining({
        toolId: ToolId.JSON_FORMATTER,
        input: '{"name":"My Hub"}',
        mode: 'format',
        source: 'home-search',
      }),
    );
  });
});
