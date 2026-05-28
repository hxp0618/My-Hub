import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import UnifiedSearchBar from '../UnifiedSearchBar';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => ({
      'search.placeholder': 'Search everywhere',
      'search.clear': 'Clear search',
      'search.searching': 'Searching...',
    }[key] ?? key),
  }),
}));

describe('UnifiedSearchBar', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders an accessible Neo-Brutalism search field', () => {
    render(<UnifiedSearchBar mode="global" value="" onChange={vi.fn()} />);

    expect(screen.getByRole('search', { name: 'Search everywhere' })).toHaveClass('unified-search');
    expect(screen.getByRole('textbox', { name: 'Search everywhere' })).toHaveClass('unified-search-input');
  });

  it('submits with Enter and clears with a large action button', () => {
    const handleChange = vi.fn();
    const handleSearch = vi.fn();

    render(
      <UnifiedSearchBar
        mode="bookmark"
        value="docs"
        onChange={handleChange}
        onSearch={handleSearch}
        placeholder="Search bookmarks"
      />
    );

    fireEvent.keyDown(screen.getByRole('textbox', { name: 'Search bookmarks' }), { key: 'Enter' });
    expect(handleSearch).toHaveBeenCalledWith('docs');

    const clearButton = screen.getByRole('button', { name: 'Clear search' });
    expect(clearButton).toHaveClass('unified-search-action', 'unified-search-clear');

    fireEvent.click(clearButton);
    expect(handleChange).toHaveBeenCalledWith('');
  });

  it('shows a labelled loading status instead of the clear button', () => {
    render(<UnifiedSearchBar mode="history" value="query" loading onChange={vi.fn()} />);

    expect(screen.getByRole('status', { name: 'Searching...' })).toHaveClass('unified-search-loading');
    expect(screen.queryByRole('button', { name: 'Clear search' })).not.toBeInTheDocument();
  });
});
