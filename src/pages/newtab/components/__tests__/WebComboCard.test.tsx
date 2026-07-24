import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import WebComboCard from '../WebComboCard';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, values?: Record<string, number | string>) => ({
      'actions.edit': 'Edit',
      'actions.delete': 'Delete',
      'home.linksCount': `${values?.count} links`,
      'itemCard.open': `Open ${values?.title}`,
      'itemCard.select': `Select ${values?.title}`,
      'itemCard.moreActions': `More actions for ${values?.title}`,
      'itemCard.dragHandle': `Drag ${values?.title}`,
    }[key] ?? key),
  }),
}));

describe('WebComboCard', () => {
  const createTab = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('chrome', { tabs: { create: createTab } });
    createTab.mockResolvedValue(undefined);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('opens every URL once without a fake hash tab', () => {
    render(
      <WebComboCard
        combo={{ id: 'daily', title: 'Daily Stack', urls: ['https://one.example', 'https://two.example'] }}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Open Daily Stack' }));

    expect(createTab).toHaveBeenNthCalledWith(1, { url: 'https://one.example', active: true });
    expect(createTab).toHaveBeenNthCalledWith(2, { url: 'https://two.example', active: false });
    expect(createTab).not.toHaveBeenCalledWith(expect.objectContaining({ url: '#' }));
  });
});
