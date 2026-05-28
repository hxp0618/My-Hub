import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Toast, ToastContainer } from '../Toast';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => ({
      'common.closeNotification': 'Close notification',
    }[key] ?? key),
  }),
}));

describe('Toast', () => {
  afterEach(() => {
    cleanup();
  });

  it('uses status semantics and large touch targets for regular feedback', () => {
    render(
      <Toast
        message="Saved"
        type="success"
        duration={30000}
        onClose={vi.fn()}
        actionText="Undo"
        onAction={vi.fn()}
      />
    );

    expect(screen.getByRole('status')).toHaveClass('toast', 'toast--success');
    expect(screen.getByRole('button', { name: 'Undo' })).toHaveClass('toast-action');
    expect(screen.getByRole('button', { name: 'Close notification' })).toHaveClass('toast-close');
  });

  it('uses alert semantics for errors', () => {
    render(
      <Toast
        message="Failed"
        type="error"
        duration={30000}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByRole('alert')).toHaveClass('toast--error');
  });

  it('stacks notifications without inline offset transforms', () => {
    render(
      <ToastContainer
        onRemove={vi.fn()}
        toasts={[
          { id: '1', message: 'First', type: 'info' },
          { id: '2', message: 'Second', type: 'warning' },
        ]}
      />
    );

    expect(screen.getByText('First')).toBeInTheDocument();
    expect(screen.getByText('Second')).toBeInTheDocument();
    expect(document.querySelector('.toast-container')).toBeInTheDocument();
    expect(Array.from(document.querySelectorAll('.toast')).every((toast) => !toast.getAttribute('style'))).toBe(true);
  });
});
