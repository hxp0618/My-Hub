import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  calculateFileHash,
  calculateHash,
  calculateHmac,
  HashCalculatorTool,
} from '../HashCalculatorTool';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => ({
      'tools.hashCalculator.input': 'Input Text',
      'tools.hashCalculator.inputPlaceholder': 'Enter text to hash...',
      'tools.hashCalculator.mode': 'Mode',
      'tools.hashCalculator.modes.text': 'Text',
      'tools.hashCalculator.modes.hmac': 'HMAC',
      'tools.hashCalculator.modes.file': 'File',
      'tools.hashCalculator.algorithm': 'Algorithm',
      'tools.hashCalculator.uppercase': 'Uppercase',
      'tools.hashCalculator.secret': 'Secret',
      'tools.hashCalculator.secretPlaceholder': 'Enter HMAC secret...',
      'tools.hashCalculator.file': 'File',
      'tools.hashCalculator.filePlaceholder': 'Choose a file to hash',
      'tools.hashCalculator.fileName': 'File: {{name}}',
      'tools.hashCalculator.fileReadError': 'Could not read file',
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

  it('calculates known HMAC values', () => {
    expect(calculateHmac('hello', 'secret', 'SHA256')).toBe(
      '88aab3ede8d3adf94d26ab90d3bafd4a2083070c3bcce9c014ee04a443847c0b',
    );
  });

  it('calculates file hashes from file bytes', async () => {
    const file = new File(['hello'], 'hello.txt', { type: 'text/plain' });

    await expect(calculateFileHash(file, 'SHA256')).resolves.toBe(calculateHash('hello', 'SHA256'));
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
