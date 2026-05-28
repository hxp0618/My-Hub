import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Pagination } from '../subscription/Pagination';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, number>) => {
      const translations: Record<string, string> = {
        'subscriptions.pagination.total': `${options?.count} items`,
        'subscriptions.pagination.pageSize': 'Per page',
        'subscriptions.pagination.prev': 'Previous',
        'subscriptions.pagination.next': 'Next',
        'subscriptions.pagination.page': `Page ${options?.current} / ${options?.total}`,
        'subscriptions.pagination.goToPage': `Go to page ${options?.page}`,
      };
      return translations[key] ?? key;
    },
  }),
}));

describe('Pagination', () => {
  afterEach(() => {
    cleanup();
  });

  it('does not render when pagination is unnecessary', () => {
    const { container } = render(
      <Pagination
        currentPage={1}
        totalPages={1}
        totalItems={10}
        pageSize={10}
        onPageChange={vi.fn()}
        onPageSizeChange={vi.fn()}
      />
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('renders semantic page controls and parses page size changes', () => {
    const onPageChange = vi.fn();
    const onPageSizeChange = vi.fn();

    render(
      <Pagination
        currentPage={2}
        totalPages={6}
        totalItems={120}
        pageSize={20}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
      />
    );

    expect(screen.getByRole('navigation', { name: 'Page 2 / 6' })).toHaveClass('subscription-pagination');
    expect(screen.getByText('120 items')).toHaveClass('subscription-pagination-total');
    expect(screen.getByRole('button', { name: 'Go to page 2' })).toHaveAttribute('aria-current', 'page');

    fireEvent.click(screen.getByRole('button', { name: 'Previous' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    fireEvent.change(screen.getByLabelText('Per page'), { target: { value: '50' } });

    expect(onPageChange).toHaveBeenNthCalledWith(1, 1);
    expect(onPageChange).toHaveBeenNthCalledWith(2, 3);
    expect(onPageSizeChange).toHaveBeenCalledWith(50);
  });
});
