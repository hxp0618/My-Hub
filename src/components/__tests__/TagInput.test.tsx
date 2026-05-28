import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import TagInput from '../TagInput';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, values?: Record<string, string>) => ({
      'common.tags': 'Tags',
      'common.removeTag': `Remove ${values?.tag}`,
      'common.tagInputPlaceholder': 'Add tags',
    }[key] ?? key),
  }),
}));

describe('TagInput', () => {
  afterEach(() => {
    cleanup();
  });

  it('adds a new tag with Enter', () => {
    const setTags = vi.fn();
    render(<TagInput tags={['docs']} setTags={setTags} />);

    const input = screen.getByRole('textbox', { name: 'Add tags' });
    expect(input).toHaveClass('tag-input-control');

    fireEvent.change(input, { target: { value: 'api' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(setTags).toHaveBeenCalledWith(['docs', 'api']);
  });

  it('does not add duplicate tags and removes existing tags accessibly', () => {
    const setTags = vi.fn();
    render(<TagInput tags={['docs', 'api']} setTags={setTags} />);

    fireEvent.change(screen.getByRole('textbox', { name: 'Add tags' }), { target: { value: 'docs' } });
    fireEvent.keyDown(screen.getByRole('textbox', { name: 'Add tags' }), { key: ',' });

    expect(setTags).not.toHaveBeenCalled();

    const removeButton = screen.getByRole('button', { name: 'Remove docs' });
    expect(removeButton).toHaveClass('tag-input-remove');

    fireEvent.click(removeButton);
    expect(setTags).toHaveBeenCalledWith(['api']);
  });

  it('marks the wrapper as focused while editing', () => {
    render(<TagInput tags={[]} setTags={vi.fn()} />);

    const input = screen.getByRole('textbox', { name: 'Add tags' });
    const wrapper = input.closest('.tag-input');

    fireEvent.focus(input);
    expect(wrapper).toHaveClass('is-focused');

    fireEvent.blur(input);
    expect(wrapper).not.toHaveClass('is-focused');
  });
});
