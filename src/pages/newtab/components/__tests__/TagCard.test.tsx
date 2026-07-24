import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TagCard } from '../TagCard';
import type { TagInfo } from '../../../../types/tags';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => {
      const translations: Record<string, string> = {
        'tags.delete': 'Delete',
        'tags.rename': 'Rename',
        'tags.selectTag': `Select tag ${options?.name}`,
        'tags.viewDetails': 'View details',
      };
      return translations[key] ?? key;
    },
  }),
}));

const tag: TagInfo = {
  name: 'Design',
  count: 3,
  bookmarkUrls: ['https://example.com'],
};

describe('TagCard accessibility', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('uses a focusable native button to open details', () => {
    const onViewDetails = vi.fn();

    render(
      <TagCard
        tag={tag}
        isMultiSelectMode={false}
        isSelected={false}
        onToggleSelect={vi.fn()}
        onViewDetails={onViewDetails}
        onRename={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    const card = screen.getByRole('button', { name: 'View details Design' });
    expect(card.tagName).toBe('BUTTON');
    card.focus();
    expect(card).toHaveFocus();
    fireEvent.click(card);

    expect(onViewDetails).toHaveBeenCalledWith(tag);
  });

  it('uses button + aria-pressed semantics in multi-select mode', () => {
    const onToggleSelect = vi.fn();

    render(
      <TagCard
        tag={tag}
        isMultiSelectMode
        isSelected={false}
        onToggleSelect={onToggleSelect}
        onViewDetails={vi.fn()}
        onRename={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    const card = screen.getByRole('button', { name: 'Select tag Design' });
    expect(card).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(card);

    expect(onToggleSelect).toHaveBeenCalledWith('Design');
  });
});
