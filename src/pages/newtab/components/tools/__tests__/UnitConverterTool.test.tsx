import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { UnitConverterTool } from '../UnitConverterTool';

const convertUnitsMock = vi.hoisted(() => vi.fn());

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { count?: number }) => ({
      'tools.unitConverter.categories.time': 'Time',
      'tools.unitConverter.categories.length': 'Length',
      'tools.unitConverter.categories.data': 'Data Storage',
      'tools.unitConverter.categories.weight': 'Weight',
      'tools.unitConverter.units.ms': 'Milliseconds (ms)',
      'tools.unitConverter.units.s': 'Seconds (s)',
      'tools.unitConverter.units.min': 'Minutes (min)',
      'tools.unitConverter.units.h': 'Hours (h)',
      'tools.unitConverter.units.d': 'Days (d)',
      'tools.unitConverter.inputValue': 'Input Value',
      'tools.unitConverter.inputPlaceholder': 'Enter value to convert...',
      'tools.unitConverter.sourceUnit': 'Source Unit',
      'tools.unitConverter.results': 'Conversion Results',
      'tools.unitConverter.source': 'Source',
      'tools.unitConverter.clear': 'Clear',
      'tools.unitConverter.clickToCopy': 'Click to copy',
      'tools.unitConverter.invalidInput': 'Please enter a valid number',
      'tools.unitConverter.conversionError': 'Unit conversion failed',
      'tools.unitConverter.hint': 'Tip text',
    }[key] ?? `${options?.count ?? ''}${key}`),
  }),
}));

vi.mock('../../../../../hooks/useCopyToClipboard', () => ({
  useCopyToClipboard: () => ({
    copy: vi.fn(),
  }),
}));

vi.mock('../../../../../utils/unitConverter', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../../../utils/unitConverter')>();
  return {
    ...actual,
    convertUnits: convertUnitsMock,
  };
});

describe('UnitConverterTool', () => {
  afterEach(() => {
    cleanup();
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('maps conversion exceptions to localized text instead of raw unit details', () => {
    convertUnitsMock.mockImplementation(() => {
      throw new Error('Unknown unit: evil-unit in category: time');
    });

    render(<UnitConverterTool isExpanded onToggleExpand={vi.fn()} />);

    fireEvent.change(screen.getByPlaceholderText('Enter value to convert...'), {
      target: { value: '42' },
    });

    expect(screen.getByText('Unit conversion failed')).toBeInTheDocument();
    expect(screen.queryByText(/evil-unit|Unknown unit/i)).not.toBeInTheDocument();
  });

  it('rejects malformed numeric input before conversion', () => {
    render(<UnitConverterTool isExpanded onToggleExpand={vi.fn()} />);

    fireEvent.change(screen.getByPlaceholderText('Enter value to convert...'), {
      target: { value: '12abc' },
    });

    expect(screen.getByText('Please enter a valid number')).toBeInTheDocument();
    expect(convertUnitsMock).not.toHaveBeenCalled();
  });

  it('clears stale results when input becomes invalid', () => {
    convertUnitsMock.mockReturnValue([{ unit: 'ms', value: '90', rawValue: 90 }]);

    render(<UnitConverterTool isExpanded onToggleExpand={vi.fn()} />);

    const input = screen.getByPlaceholderText('Enter value to convert...');
    fireEvent.change(input, { target: { value: '90' } });
    expect(screen.getByText('90')).toBeInTheDocument();

    fireEvent.change(input, { target: { value: '1e309' } });

    expect(screen.getByText('Please enter a valid number')).toBeInTheDocument();
    expect(screen.queryByText('90')).not.toBeInTheDocument();
  });
});
