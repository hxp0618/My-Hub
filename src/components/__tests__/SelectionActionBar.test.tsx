import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SelectionActionBar } from '../SelectionActionBar';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { count?: number }) => ({
      'common.cancel': 'Cancel',
      'history.selectedCount': `${options?.count ?? 0} selected`,
    }[key] ?? key),
  }),
}));

describe('SelectionActionBar', () => {
  afterEach(() => {
    cleanup();
  });

  it('does not render when nothing is selected', () => {
    render(
      <SelectionActionBar
        selectionCount={0}
        actions={[]}
        onCancel={vi.fn()}
      />
    );

    expect(screen.queryByRole('toolbar')).not.toBeInTheDocument();
  });

  it('renders a semantic toolbar with accessible actions', () => {
    const onDelete = vi.fn();
    const onCancel = vi.fn();

    render(
      <SelectionActionBar
        selectionCount={3}
        actions={[
          { label: 'Delete', onClick: onDelete, icon: 'delete', className: 'nb-btn-danger' },
          { label: 'Disabled', onClick: vi.fn(), disabled: true },
        ]}
        onCancel={onCancel}
      />
    );

    const toolbar = screen.getByRole('toolbar', { name: '3 selected' });

    expect(toolbar).toHaveClass('selection-action-bar');
    expect(screen.getByText('3 selected')).toHaveClass('selection-action-bar-count');
    expect(screen.getByRole('button', { name: 'Delete' })).toHaveClass('selection-action-bar-button');
    expect(screen.getByRole('button', { name: 'Disabled' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveClass('selection-action-bar-close');

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
