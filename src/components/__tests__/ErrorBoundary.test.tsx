import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import i18n from '../../i18n';
import { ErrorBoundary } from '../ErrorBoundary';

const CrashingChild = () => {
  throw new Error('raw secret token at https://secret.example.com');
};

describe('ErrorBoundary', () => {
  afterEach(async () => {
    cleanup();
    vi.restoreAllMocks();
    await i18n.changeLanguage('zh-CN');
  });

  it('renders a safe fallback without exposing raw errors or component stacks', async () => {
    await i18n.changeLanguage('en');
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    render(
      <ErrorBoundary>
        <CrashingChild />
      </ErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('Error details are hidden to protect your page content and local data.')).toBeInTheDocument();
    expect(screen.queryByText(/raw secret token/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/secret\.example\.com/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/CrashingChild/i)).not.toBeInTheDocument();

    const loggedText = JSON.stringify(consoleErrorSpy.mock.calls);
    expect(loggedText).not.toContain('raw secret token');
    expect(loggedText).not.toContain('secret.example.com');
  });
});
