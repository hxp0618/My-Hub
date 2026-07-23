import React, { useState } from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Modal } from '../Modal';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key === 'common.close' ? 'Close' : key }),
}));

const ModalHarness = () => {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button type="button" onClick={() => setOpen(true)}>Open settings</button>
      <main data-testid="background"><button type="button">Background action</button></main>
      <Modal isOpen={open} onClose={() => setOpen(false)} title="Settings">
        <button type="button">First action</button>
        <button type="button">Last action</button>
      </Modal>
    </div>
  );
};

describe('Modal focus management', () => {
  afterEach(() => cleanup());

  it('traps focus, makes the background inert, and restores the trigger on close', async () => {
    render(<ModalHarness />);
    const trigger = screen.getByRole('button', { name: 'Open settings' });
    trigger.focus();
    fireEvent.click(trigger);

    const dialog = screen.getByRole('dialog', { name: 'Settings' });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus());
    expect(screen.getByTestId('background')).toHaveAttribute('inert');
    expect(screen.getByTestId('background')).toHaveAttribute('aria-hidden', 'true');

    const lastAction = screen.getByRole('button', { name: 'Last action' });
    lastAction.focus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus();

    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(dialog).not.toBeInTheDocument());
    await waitFor(() => expect(trigger).toHaveFocus());
    expect(screen.getByTestId('background')).not.toHaveAttribute('inert');
    expect(screen.getByTestId('background')).not.toHaveAttribute('aria-hidden');
  });
});
