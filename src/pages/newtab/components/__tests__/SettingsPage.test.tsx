import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import SettingsPage from '../SettingsPage';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => ({
      'sidebar.settings': 'Settings',
      'settings.general': 'General',
      'settings.notificationMenu': 'Notifications',
      'settings.permissionsMenu': 'Permissions',
      'settings.dataMenu': 'Data',
      'settings.llm': 'LLM Settings',
      'settings.previousSection': 'Show previous settings sections',
      'settings.nextSection': 'Show more settings sections',
    }[key] ?? key),
  }),
}));

vi.mock('../GeneralSettings', () => ({
  default: ({ section }: { section: string }) => <div>General section: {section}</div>,
}));

vi.mock('../LLMSettings', () => ({ default: () => <div>LLM content</div> }));

describe('SettingsPage', () => {
  afterEach(() => cleanup());

  it('exposes discoverable previous and next controls for the mobile section rail', () => {
    render(<SettingsPage onClose={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'Show previous settings sections' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Show more settings sections' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'LLM Settings' }));
    expect(screen.getByText('LLM content')).toBeInTheDocument();
  });
});
