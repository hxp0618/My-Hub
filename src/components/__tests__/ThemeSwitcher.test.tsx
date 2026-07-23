import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ThemeProvider } from '../../contexts/ThemeContext';
import { ThemeSwitcher } from '../ThemeSwitcher';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => ({
      'settings.theme': 'Theme',
      'settings.selectTheme': 'Select theme',
      'settings.themeLight': 'Light Mode',
      'settings.themeLightDesc': 'A bright, crisp interface for daytime use',
      'settings.themeDark': 'Dark Mode',
      'settings.themeDarkDesc': 'A darker interface that reduces eye strain at night',
      'settings.themeSystem': 'Follow System',
      'settings.themeSystemDesc': 'Automatically follows your system appearance',
      'settings.themeEyeCare': 'Eye Care',
      'settings.themeEyeCareDesc': 'A warmer palette that reduces blue light',
    }[key] ?? key),
  }),
}));

describe('ThemeSwitcher', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('theme', 'dark');
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: query.includes('dark'),
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    });
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it('renders localized theme names and descriptions in the grid variant', () => {
    render(
      <ThemeProvider>
        <ThemeSwitcher variant="grid" showDescriptions />
      </ThemeProvider>
    );

    expect(screen.getByRole('radiogroup', { name: 'Select theme' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Light Mode' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Dark Mode' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByText('A darker interface that reduces eye strain at night')).toHaveClass('theme-switcher-accent-text');
    expect(screen.getByText('A warmer palette that reduces blue light')).toBeInTheDocument();
    expect(screen.queryByText('浅色模式')).not.toBeInTheDocument();
    expect(screen.queryByText('护眼模式')).not.toBeInTheDocument();
  });

  it('supports keyboard theme selection in a single radio group', () => {
    render(
      <ThemeProvider>
        <ThemeSwitcher variant="grid" showDescriptions />
      </ThemeProvider>
    );

    const darkOption = screen.getByRole('radio', { name: 'Dark Mode' });
    const systemOption = screen.getByRole('radio', { name: 'Follow System' });

    expect(darkOption).toHaveAttribute('tabindex', '0');
    expect(systemOption).toHaveAttribute('tabindex', '-1');

    fireEvent.keyDown(darkOption, { key: 'ArrowRight' });

    expect(systemOption).toHaveAttribute('aria-checked', 'true');
    expect(systemOption).toHaveAttribute('tabindex', '0');

    fireEvent.keyDown(systemOption, { key: 'End' });
    expect(screen.getByRole('radio', { name: 'Eye Care' })).toHaveAttribute('aria-checked', 'true');
  });
});
