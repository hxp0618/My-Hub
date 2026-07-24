import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  formatLocalDateInput,
  parseDateString,
  parseLocalDateInput,
  parseTimestampInput,
  TimestampConverterTool,
} from '../TimestampConverterTool';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => ({
      'tools.timestampConverter.current': 'Current Timestamp',
      'tools.timestampConverter.seconds': 'Seconds',
      'tools.timestampConverter.milliseconds': 'Milliseconds',
      'tools.timestampConverter.copy': 'Copy',
      'tools.timestampConverter.dateBoundary': 'Date Boundary Timestamps',
      'tools.timestampConverter.quickSelect': 'Quick Select',
      'tools.timestampConverter.yesterday': 'Yesterday',
      'tools.timestampConverter.today': 'Today',
      'tools.timestampConverter.tomorrow': 'Tomorrow',
      'tools.timestampConverter.selectDate': 'Select Date',
      'tools.timestampConverter.startTime': 'Start Time (00:00:00)',
      'tools.timestampConverter.endTime': 'End Time (23:59:59)',
      'tools.timestampConverter.conversionTools': 'Conversion Tools',
      'tools.timestampConverter.timestampToDate': 'Timestamp to Date',
      'tools.timestampConverter.dateToTimestamp': 'Date to Timestamp',
      'tools.timestampConverter.timestampPlaceholder': 'Enter timestamp (seconds or milliseconds)',
      'tools.timestampConverter.datePlaceholder': 'yyyy-mm-dd hh:mm:ss or yyyy/mm/dd',
      'tools.timestampConverter.convert': 'Convert',
      'tools.timestampConverter.invalidTimestamp': 'Invalid timestamp',
    }[key] ?? key),
  }),
}));

vi.mock('../../../../../hooks/useCopyToClipboard', () => ({
  useCopyToClipboard: () => ({
    copy: vi.fn(),
  }),
}));

describe('TimestampConverterTool', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders the conversion section title through i18n', () => {
    render(<TimestampConverterTool isExpanded onToggleExpand={vi.fn()} />);

    expect(screen.getByText('Conversion Tools')).toBeInTheDocument();
    expect(screen.queryByText('转换工具')).not.toBeInTheDocument();
  });

  it('rejects partially numeric timestamp input', () => {
    expect(parseTimestampInput('1710000000')).toBe(1710000000);
    expect(parseTimestampInput('1710000000abc')).toBeNull();
    expect(parseTimestampInput('1.5')).toBeNull();
    expect(parseTimestampInput('9007199254740992')).toBeNull();
  });

  it('rejects normalized invalid calendar dates', () => {
    expect(parseDateString('2026-02-31')).toBeNull();
    expect(parseDateString('2026/02/31 00:00:00')).toBeNull();
    expect(parseDateString('2026-02-31T00:00')).toBeNull();
    expect(parseDateString('2026-01-01 24:00:00')).toBeNull();
  });

  it('accepts valid leap-day and datetime-local input', () => {
    expect(parseDateString('2024-02-29')?.getFullYear()).toBe(2024);
    expect(parseDateString('2026-05-26T09:30')?.getMinutes()).toBe(30);
  });

  it('formats and parses date inputs in local time instead of UTC', () => {
    expect(formatLocalDateInput(new Date(2026, 0, 2, 1, 30))).toBe('2026-01-02');
    const parsed = parseLocalDateInput('2026-07-23');
    expect(parsed?.getFullYear()).toBe(2026);
    expect(parsed?.getMonth()).toBe(6);
    expect(parsed?.getDate()).toBe(23);
    expect(parsed?.getHours()).toBe(0);
  });
});
