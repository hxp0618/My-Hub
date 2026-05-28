import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LanguageSwitcher, LanguageSwitcherCompact } from '../LanguageSwitcher';

const i18nMock = vi.hoisted(() => ({
  language: 'zh-CN',
  changeLanguage: vi.fn(),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    i18n: i18nMock,
    t: (key: string) => ({
      'settings.language': 'Language',
      'settings.languageAriaLabel': 'Change language',
      'settings.languageOptions.zh-CN': 'Simplified Chinese',
      'settings.languageOptions.en': 'English',
    }[key] ?? key),
  }),
}));

describe('LanguageSwitcher', () => {
  beforeEach(() => {
    i18nMock.language = 'zh-CN';
    i18nMock.changeLanguage.mockClear();
  });

  afterEach(() => {
    cleanup();
  });

  it('opens a click-driven menu and selects a language', () => {
    render(<LanguageSwitcher />);

    const trigger = screen.getByRole('button', { name: 'Change language' });
    const menu = screen.getByRole('menu', { name: 'Language' });

    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(menu).not.toHaveClass('is-open');

    fireEvent.click(trigger);

    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(menu).toHaveClass('is-open');
    expect(screen.getByRole('menuitemradio', { name: /Simplified Chinese/ })).toHaveAttribute('aria-checked', 'true');

    fireEvent.click(screen.getByRole('menuitemradio', { name: /English/ }));

    expect(i18nMock.changeLanguage).toHaveBeenCalledWith('en');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('supports keyboard open, navigation, and Escape close in compact mode', () => {
    render(<LanguageSwitcherCompact />);

    const trigger = screen.getByRole('button', { name: 'Change language' });
    const menu = screen.getByRole('menu', { name: 'Language' });

    fireEvent.keyDown(trigger, { key: 'ArrowDown' });
    expect(menu).toHaveClass('is-open');

    const chineseOption = screen.getByRole('menuitemradio', { name: /Simplified Chinese/ });
    fireEvent.keyDown(chineseOption, { key: 'ArrowDown' });
    fireEvent.keyDown(chineseOption, { key: 'Escape' });

    expect(menu).not.toHaveClass('is-open');
  });
});
