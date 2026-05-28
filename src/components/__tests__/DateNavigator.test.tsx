import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DateNavigator } from '../DateNavigator';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    i18n: { language: 'en' },
    t: (key: string, values?: Record<string, string>) => ({
      'history.showAllHistory': 'Show all history',
      'history.dateNavigator': 'History date filters',
      'history.previousDate': 'Previous date filter',
      'history.nextDate': 'Next date filter',
      'history.filterByDate': `Filter history by ${values?.date}`,
      'time.today': 'Today',
      'time.yesterday': 'Yesterday',
    }[key] ?? key),
  }),
}));

describe('DateNavigator', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 4, 27, 12, 0, 0));
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('renders accessible date filter navigation', () => {
    render(
      <DateNavigator
        availableDates={['2026-05-27', '2026-05-26']}
        onDateChange={vi.fn()}
      />
    );

    expect(screen.getByRole('navigation', { name: 'History date filters' })).toHaveClass('date-navigator');
    expect(screen.getByRole('button', { name: 'Previous date filter' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Next date filter' })).toHaveClass('date-navigator-arrow');
    expect(screen.getByRole('button', { name: 'Show all history' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getAllByRole('button', { name: /Filter history by/ })[0]).toHaveClass('date-navigator-preset');
  });

  it('supports click and keyboard date navigation', () => {
    const handleDateChange = vi.fn();

    render(
      <DateNavigator
        availableDates={['2026-05-27', '2026-05-26']}
        onDateChange={handleDateChange}
      />
    );

    const navigator = screen.getByRole('navigation', { name: 'History date filters' });
    fireEvent.keyDown(navigator, { key: 'ArrowRight' });

    expect(handleDateChange).toHaveBeenLastCalledWith({
      startTime: new Date(2026, 4, 27, 0, 0, 0, 0).getTime(),
      endTime: new Date(2026, 4, 27, 23, 59, 59, 999).getTime(),
    });

    fireEvent.keyDown(navigator, { key: 'End' });
    expect(handleDateChange).toHaveBeenLastCalledWith({
      startTime: new Date(2026, 4, 26, 0, 0, 0, 0).getTime(),
      endTime: new Date(2026, 4, 26, 23, 59, 59, 999).getTime(),
    });

    fireEvent.keyDown(navigator, { key: 'Home' });
    expect(handleDateChange).toHaveBeenLastCalledWith({
      startTime: 0,
      endTime: new Date(2026, 4, 27, 12, 0, 0, 0).getTime(),
    });
  });
});
