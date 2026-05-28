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

  it('opens details from keyboard when not in multi-select mode', () => {
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

    fireEvent.keyDown(screen.getByRole('button', { name: 'View details Design' }), { key: 'Enter' });

    expect(onViewDetails).toHaveBeenCalledWith(tag);
  });

  it('uses button + aria-pressed semantics and toggles selection from keyboard in multi-select mode', () => {
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

    fireEvent.keyDown(card, { key: ' ' });

    expect(onToggleSelect).toHaveBeenCalledWith('Design');
  });
});
