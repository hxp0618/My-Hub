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

  it('uses a real external link for URL cards', () => {
    render(
      <ItemCard
        href="https://example.com/docs"
        title="Example Docs"
        hostname="example.com"
        faviconUrl="https://example.com/favicon.ico"
      />
    );

    const card = screen.getByRole('link', { name: 'Open Example Docs' });
    expect(card).toHaveClass('item-card-main');
    expect(card).toHaveAttribute('href', 'https://example.com/docs');
    expect(card).toHaveAttribute('target', '_blank');
    expect(card).toHaveAttribute('rel', 'noopener noreferrer');
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

    fireEvent.click(card);
    expect(handleSelect).toHaveBeenCalledTimes(1);
  });

  it('uses the same custom activation callback for action cards', () => {
    const handleActivate = vi.fn();

    render(
      <ItemCard
        onActivate={handleActivate}
        title="Action Card"
        hostname="2 links"
        faviconUrl="data:image/svg+xml,icon"
      />
    );

    const card = screen.getByRole('button', { name: 'Open Action Card' });
    fireEvent.click(card);
    expect(handleActivate).toHaveBeenCalledTimes(1);
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
    expect(screen.getByRole('link', { name: 'Open Action Item' }).contains(menuItem)).toBe(false);
  });
});
