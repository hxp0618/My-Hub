import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { SearchResultItem } from '../../../../types/search';
import { ToolId } from '../../../../types/tools';
import { CommandPalette } from '../CommandPalette';

const searchState = vi.hoisted(() => ({
  results: [] as SearchResultItem[],
  loading: false,
}));

vi.mock('../../../../hooks/useGlobalSearch', () => ({
  useGlobalSearch: () => ({ results: searchState.results, loading: searchState.loading }),
}));

vi.mock('../../../../types/searchActions', () => ({
  SEARCH_ACTIONS: [],
}));

vi.mock('../../../../services/tagService', () => ({
  TagService: { aggregateTags: vi.fn().mockResolvedValue([]) },
}));

vi.mock('../../../../services/SubscriptionService', () => ({
  subscriptionService: { getAllSubscriptions: vi.fn().mockResolvedValue([]) },
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => ({
      'common.close': 'Close',
      'commandPalette.title': 'Global commands',
      'commandPalette.placeholder': 'Search commands',
      'commandPalette.results': 'Command results',
      'commandPalette.empty': 'No results',
      'commandPalette.commandHelp': 'Command filters',
      'commandPalette.hints.tool': 'Tools',
      'commandPalette.hints.tag': 'Tags',
      'commandPalette.hints.url': 'URLs',
      'commandPalette.hints.action': 'Actions',
      'commandPalette.groups.tools': 'Tools',
    }[key] ?? key),
  }),
}));

const toolResult = (toolId: ToolId, title: string): SearchResultItem => ({
  type: 'tool',
  toolId,
  title,
  description: `${title} description`,
  icon: 'construction',
  category: 'developer',
});

const renderPalette = () => {
  const props = {
    onClose: vi.fn(),
    onOpenTool: vi.fn(),
    onOpenAction: vi.fn(),
    onOpenTag: vi.fn(),
    onOpenSubscription: vi.fn(),
  };
  render(<CommandPalette {...props} />);
  return props;
};

describe('CommandPalette', () => {
  afterEach(() => {
    cleanup();
    localStorage.clear();
    searchState.results = [];
    searchState.loading = false;
    vi.clearAllMocks();
  });

  it('uses Arrow keys and Enter to run the active command', async () => {
    searchState.results = [
      toolResult(ToolId.JSON_FORMATTER, 'JSON Formatter'),
      toolResult(ToolId.URL_CODEC, 'URL Codec'),
    ];
    const props = renderPalette();
    const input = screen.getByRole('textbox', { name: 'Search commands' });

    await waitFor(() => expect(screen.getByText('URL Codec')).toBeInTheDocument());
    for (let index = 0; index < 6; index += 1) {
      fireEvent.keyDown(input, { key: 'ArrowDown' });
    }
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(props.onClose).toHaveBeenCalledTimes(1);
    expect(props.onOpenTool).toHaveBeenCalledWith(ToolId.URL_CODEC);
  });

  it('deduplicates the same tool returned by search and the local catalog', async () => {
    searchState.results = [toolResult(ToolId.JSON_FORMATTER, 'JSON Formatter')];
    renderPalette();
    const input = screen.getByRole('textbox', { name: 'Search commands' });
    fireEvent.change(input, { target: { value: 'json' } });

    await waitFor(() => {
      expect(screen.getAllByRole('option').filter(option => option.id === 'command-tool-json-formatter')).toHaveLength(1);
    });
  });

  it('exposes command-help chips and a localized empty state', async () => {
    renderPalette();
    const input = screen.getByRole('textbox', { name: 'Search commands' });
    fireEvent.click(screen.getByRole('button', { name: /tool:/i }));
    expect(input).toHaveValue('tool:');

    fireEvent.change(input, { target: { value: 'no-such-command-4f57' } });
    await waitFor(() => expect(screen.getByText('No results')).toBeInTheDocument());
  });
});
