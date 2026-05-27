import React from 'react';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  generatePassword,
  parsePasswordLength,
  PasswordGeneratorTool,
} from '../PasswordGeneratorTool';

const HISTORY_KEY = 'password-generator-history';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => ({
      'tools.passwordGenerator.length': 'Password Length',
      'tools.passwordGenerator.options': 'Character Options',
      'tools.passwordGenerator.uppercase': 'Uppercase (A-Z)',
      'tools.passwordGenerator.lowercase': 'Lowercase (a-z)',
      'tools.passwordGenerator.numbers': 'Numbers (0-9)',
      'tools.passwordGenerator.symbols': 'Symbols (!@#$...)',
      'tools.passwordGenerator.generate': 'Generate',
      'tools.passwordGenerator.copy': 'Copy',
      'tools.passwordGenerator.result': 'Generated Password',
      'tools.passwordGenerator.emptyResult': 'Click generate to create password',
      'tools.passwordGenerator.noOptionsSelected': 'Select at least one character type',
      'tools.passwordGenerator.strength': 'Strength',
      'tools.passwordGenerator.weak': 'Weak',
      'tools.passwordGenerator.medium': 'Medium',
      'tools.passwordGenerator.strong': 'Strong',
      'tools.passwordGenerator.veryStrong': 'Very Strong',
      'tools.passwordGenerator.history': 'History',
      'tools.passwordGenerator.clearHistory': 'Clear',
      'tools.passwordGenerator.noHistory': 'No history yet',
      'tools.passwordGenerator.delete': 'Delete',
    }[key] ?? key),
  }),
}));

vi.mock('../../../../../hooks/useCopyToClipboard', () => ({
  useCopyToClipboard: () => ({
    copy: vi.fn(),
  }),
}));

describe('PasswordGeneratorTool', () => {
  afterEach(() => {
    cleanup();
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('falls back to an empty history when stored history is not an array', async () => {
    localStorage.setItem(HISTORY_KEY, JSON.stringify({ password: 'bad-value' }));

    render(<PasswordGeneratorTool isExpanded onToggleExpand={vi.fn()} />);

    expect(await screen.findByText('No history yet')).toBeInTheDocument();
    expect(screen.getByText('History (0/20)')).toBeInTheDocument();
  });

  it('keeps only valid password history records from local storage', async () => {
    localStorage.setItem(HISTORY_KEY, JSON.stringify([
      { password: 'ValidPass123!', timestamp: 1710000000000 },
      { password: '', timestamp: 1710000000001 },
      { password: 'MissingTimestamp' },
    ]));

    render(<PasswordGeneratorTool isExpanded onToggleExpand={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('ValidPass123!')).toBeInTheDocument();
    });
    expect(screen.getByText('History (1/20)')).toBeInTheDocument();
    expect(screen.queryByText('MissingTimestamp')).not.toBeInTheDocument();
  });

  it('includes every selected character type in generated passwords', () => {
    const password = generatePassword({
      length: 32,
      uppercase: true,
      lowercase: true,
      numbers: true,
      symbols: true,
    });

    expect(password).toHaveLength(32);
    expect(password).toMatch(/[A-Z]/);
    expect(password).toMatch(/[a-z]/);
    expect(password).toMatch(/[0-9]/);
    expect(password).toMatch(/[!@#$%^&*()_+\-=[\]{}|;:,.<>?]/);
  });

  it('strictly parses password length within the supported range', () => {
    expect(parsePasswordLength('32')).toBe(32);
    expect(parsePasswordLength(' 128 ')).toBe(128);
    expect(parsePasswordLength('2')).toBe(8);
    expect(parsePasswordLength('999')).toBe(128);
    expect(parsePasswordLength('16abc', 24)).toBe(24);
    expect(parsePasswordLength('16.5', 24)).toBe(24);
    expect(parsePasswordLength(Number.NaN, 24)).toBe(24);
  });

  it('sanitizes generated password length before building output', () => {
    expect(generatePassword({
      length: 2,
      uppercase: true,
      lowercase: true,
      numbers: false,
      symbols: false,
    })).toHaveLength(8);

    expect(generatePassword({
      length: 999,
      uppercase: true,
      lowercase: false,
      numbers: false,
      symbols: false,
    })).toHaveLength(128);
  });

  it('returns an empty password when no character type is selected', () => {
    expect(generatePassword({
      length: 16,
      uppercase: false,
      lowercase: false,
      numbers: false,
      symbols: false,
    })).toBe('');
  });
});
