import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ItemCard } from '../ItemCard';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, values?: Record<string, string>) => ({
      'itemCard.open': `Open ${values?.title}`,
      'itemCard.select': `Select ${values?.title}`,
      'itemCard.moreActions': `More actions for ${values?.title}`,
      'itemCard.dragHandle': `Drag ${values?.title}`,
      'time.days': `${values?.count} visits`,
    }[key] ?? key),
  }),
}));

describe('ItemCard', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('opens the target from keyboard with link semantics', () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);

    render(
      <ItemCard
        href="https://example.com/docs"
        title="Example Docs"
        hostname="example.com"
        faviconUrl="https://example.com/favicon.ico"
      />
    );

    const card = screen.getByRole('link', { name: 'Open Example Docs' });
    expect(card).toHaveClass('item-card');

    fireEvent.keyDown(card, { key: 'Enter' });

    expect(openSpy).toHaveBeenCalledWith('https://example.com/docs', '_blank', 'noopener,noreferrer');
  });

  it('uses checkbox semantics in multi-select mode', () => {
    const handleSelect = vi.fn();

    render(
      <ItemCard
        href="https://example.com"
        title="Selectable Item"
        hostname="example.com"
        faviconUrl="https://example.com/favicon.ico"
        isMultiSelectMode
        isSelected
        onSelect={handleSelect}
      />
    );

    const card = screen.getByRole('button', { name: 'Select Selectable Item' });
    expect(card).toHaveAttribute('aria-pressed', 'true');

    fireEvent.keyDown(card, { key: ' ' });
    expect(handleSelect).toHaveBeenCalledTimes(1);
  });

  it('renders an accessible action menu with real buttons', () => {
    const handleEdit = vi.fn();

    render(
      <ItemCard
        href="https://example.com"
        title="Action Item"
        hostname="example.com"
        faviconUrl="https://example.com/favicon.ico"
        actions={[{ label: 'Edit', icon: 'edit', onClick: handleEdit }]}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'More actions for Action Item' }));

    const menuItem = screen.getByRole('menuitem', { name: 'Edit' });
    expect(menuItem).toHaveClass('item-card-menu-item');

    fireEvent.click(menuItem);
    expect(handleEdit).toHaveBeenCalledTimes(1);
  });
});
