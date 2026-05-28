import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ConfirmDialog } from '../ConfirmDialog';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => ({
      'common.cancel': 'Cancel',
      'common.confirm': 'Confirm',
    }[key] ?? key),
  }),
}));

describe('ConfirmDialog', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders the semantic dialog on the panel with stable copy', () => {
    render(
      <ConfirmDialog
        isOpen
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        title="Delete item"
        message="This action cannot be undone."
        danger
      />
    );

    const dialog = screen.getByRole('dialog', { name: 'Delete item' });

    expect(dialog).toHaveClass('confirm-dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByText('This action cannot be undone.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveClass('confirm-dialog-button');
    expect(screen.getByRole('button', { name: 'Confirm' })).toHaveClass('confirm-dialog-button');
    expect(document.querySelector('.confirm-dialog-overlay')).toBeInTheDocument();
  });

  it('closes on Escape and backdrop click', () => {
    const onClose = vi.fn();

    const { rerender } = render(
      <ConfirmDialog
        isOpen
        onClose={onClose}
        onConfirm={vi.fn()}
        title="Confirm"
        message="Continue?"
      />
    );

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);

    rerender(
      <ConfirmDialog
        isOpen
        onClose={onClose}
        onConfirm={vi.fn()}
        title="Confirm"
        message="Continue?"
      />
    );

    fireEvent.click(document.querySelector('.confirm-dialog-overlay') as Element);
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('confirms and then closes', () => {
    const onClose = vi.fn();
    const onConfirm = vi.fn();

    render(
      <ConfirmDialog
        isOpen
        onClose={onClose}
        onConfirm={onConfirm}
        title="Confirm"
        message="Continue?"
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
