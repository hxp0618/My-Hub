import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { calculateHash, HashCalculatorTool } from '../HashCalculatorTool';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => ({
      'tools.hashCalculator.input': 'Input Text',
      'tools.hashCalculator.inputPlaceholder': 'Enter text to hash...',
      'tools.hashCalculator.algorithm': 'Algorithm',
      'tools.hashCalculator.uppercase': 'Uppercase',
      'tools.hashCalculator.result': 'Hash Result',
      'tools.hashCalculator.lengthLabel': `${options?.count ?? 0} chars`,
      'tools.hashCalculator.copy': 'Copy',
      'tools.hashCalculator.clear': 'Clear',
      'tools.hashCalculator.emptyInput': 'Please enter text',
    }[key] ?? key),
  }),
}));

vi.mock('../../../../../hooks/useCopyToClipboard', () => ({
  useCopyToClipboard: () => ({
    copy: vi.fn(),
  }),
}));

describe('HashCalculatorTool', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('calculates known SHA-256 hashes', () => {
    expect(calculateHash('My Hub', 'SHA256')).toBe(
      'a4d17955a117d4068ab54bdf1cb46f20d4fd91f0094afe78e5b542ef9d6ba43f',
    );
  });

  it('uses localized result length labels instead of hardcoded text', async () => {
    render(<HashCalculatorTool isExpanded onToggleExpand={vi.fn()} />);

    fireEvent.change(screen.getByPlaceholderText('Enter text to hash...'), {
      target: { value: 'My Hub' },
    });

    await waitFor(() => {
      expect(screen.getByText('(64 chars)')).toBeInTheDocument();
    });
    expect(screen.queryByText('(64 characters)')).not.toBeInTheDocument();
  });
});
