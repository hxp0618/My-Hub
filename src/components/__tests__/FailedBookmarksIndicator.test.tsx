import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FailedBookmarksIndicator } from '../FailedBookmarksIndicator';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => {
      const messages: Record<string, string> = {
        'bookmarks.failedTagsRetryLabel': `${options?.count} failed tag generations`,
        'bookmarks.failedTagsRetryHint': 'Click to regenerate failed tags',
      };

      return messages[key] ?? key;
    },
  }),
}));

describe('FailedBookmarksIndicator', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders localized retry copy and triggers retry', () => {
    const onRetryClick = vi.fn();

    render(<FailedBookmarksIndicator failureCount={3} onRetryClick={onRetryClick} />);

    const button = screen.getByRole('button', { name: 'Click to regenerate failed tags' });
    expect(button).toHaveTextContent('3 failed tag generations');
    expect(button).toHaveClass('nb-btn', 'nb-btn-danger');
    expect(screen.queryByText('个标签生成失败')).not.toBeInTheDocument();

    fireEvent.click(button);

    expect(onRetryClick).toHaveBeenCalledTimes(1);
  });

  it('does not render when there are no failures', () => {
    render(<FailedBookmarksIndicator failureCount={0} onRetryClick={vi.fn()} />);

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
