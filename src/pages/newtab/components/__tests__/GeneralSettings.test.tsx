import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import GeneralSettings from '../GeneralSettings';

const mocks = vi.hoisted(() => ({
  exportData: vi.fn(),
  importData: vi.fn(),
  changeLanguage: vi.fn(),
  setBrightness: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    i18n: {
      language: 'en',
      changeLanguage: mocks.changeLanguage,
    },
    t: (key: string, options?: Record<string, unknown>) => {
      const translations: Record<string, string> = {
        'common.cancel': 'Cancel',
        'common.reload': 'Reload Page',
        'dataSync.exportError': 'Export failed',
        'dataSync.importSuccess': 'Import succeeded',
        'dataSync.importError': 'Import failed',
        'settings.generalTitle': 'General',
        'settings.theme': 'Theme',
        'settings.themeDesc': 'Choose a theme',
        'settings.brightness': 'Brightness',
        'settings.brightnessDesc': 'Adjust brightness',
        'settings.brightnessReset': 'Reset brightness',
        'settings.language': 'Language',
        'settings.languageDesc': 'Choose language',
        'settings.languageOptions.zh-CN': 'Chinese',
        'settings.languageOptions.en': 'English',
        'settings.autoSuggestTitle': 'Auto suggest',
        'settings.autoSuggestDesc': 'Suggest bookmark info',
        'settings.cardsPerRow': 'Cards per row',
        'settings.cardsPerRowDesc': 'Choose card density',
        'settings.cardsPerRowOption': `${options?.count} cards`,
        'settings.notificationTitle': 'Notifications',
        'settings.notificationDesc': 'Notification settings',
        'settings.permissionsTitle': 'Permissions',
        'settings.permissionsDesc': 'Permission notes',
        'settings.dataManagement': 'Data Management',
        'settings.exportDataTitle': 'Export Data',
        'settings.exportDataDesc': 'Export app data',
        'settings.exportButton': 'Export',
        'settings.exportSensitiveTitle': 'Include Sensitive Settings',
        'settings.exportSensitiveDesc': 'Include API keys and notification secrets.',
        'settings.exportSafeModeHint': 'Safe mode by default.',
        'settings.exportSensitiveWarning': 'Full backup contains usable secrets.',
        'settings.exportSensitiveConfirm': 'Full export includes usable secrets. Continue?',
        'settings.importDataTitle': 'Import Data',
        'settings.importDataDesc': 'Import app data',
        'settings.importButton': 'Import',
        'settings.moreFeaturesComing': 'More features coming soon.',
      };

      if (key.startsWith('settings.permissions.')) {
        return key;
      }

      return translations[key] ?? key;
    },
  }),
}));

vi.mock('../../../../contexts/ThemeContext', () => ({
  sanitizeBrightnessInput: (value: unknown) => (
    typeof value === 'number' && Number.isFinite(value)
      ? Math.max(0.5, Math.min(1, value))
      : 1
  ),
  useTheme: () => ({
    brightness: 1,
    setBrightness: mocks.setBrightness,
  }),
}));

vi.mock('../../../../contexts/ToastContext', () => ({
  useToastContext: () => ({
    success: mocks.toastSuccess,
    error: mocks.toastError,
    warning: vi.fn(),
    info: vi.fn(),
    showToast: vi.fn(),
  }),
}));

vi.mock('../../../../components/ThemeSwitcher', () => ({
  ThemeSwitcher: () => <div>Theme Switcher</div>,
}));

vi.mock('../../../../components/MenuOrderConfig', () => ({
  MenuOrderConfig: () => <div>Menu Order</div>,
}));

vi.mock('../../../../components/NotificationSettings', () => ({
  NotificationSettings: () => <div>Notification Settings</div>,
}));

vi.mock('../../../../lib/dataSync', () => ({
  exportData: mocks.exportData,
  importData: mocks.importData,
}));

describe('GeneralSettings export confirmation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('exports redacted data directly when sensitive export is disabled', () => {
    render(<GeneralSettings section="data" />);

    fireEvent.click(screen.getByRole('button', { name: 'Export' }));

    expect(mocks.exportData).toHaveBeenCalledWith({ includeSensitiveData: false });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('shows a toast when export fails', async () => {
    mocks.exportData.mockRejectedValueOnce(new Error('nope'));

    render(<GeneralSettings section="data" />);

    fireEvent.click(screen.getByRole('button', { name: 'Export' }));

    await waitFor(() => {
      expect(mocks.toastError).toHaveBeenCalledWith('Export failed');
    });
  });

  it('uses an app confirmation dialog before exporting sensitive data', () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(<GeneralSettings section="data" />);

    fireEvent.click(screen.getByRole('checkbox', { name: 'Include Sensitive Settings' }));
    fireEvent.click(screen.getByRole('button', { name: 'Export' }));

    expect(confirmSpy).not.toHaveBeenCalled();
    expect(mocks.exportData).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Full export includes usable secrets. Continue?')).toBeInTheDocument();

    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Export' }));

    expect(mocks.exportData).toHaveBeenCalledWith({ includeSensitiveData: true });
  });

  it('falls back to safe display settings when saved settings are corrupted', () => {
    localStorage.setItem('autoSuggestBookmarkInfo', JSON.stringify('true'));
    localStorage.setItem('cardsPerRow', '12');

    render(<GeneralSettings />);

    expect(screen.getByText('General')).toBeInTheDocument();
    expect((screen.getByDisplayValue('4 cards') as HTMLSelectElement).value).toBe('4');
    expect((screen.getAllByRole('checkbox')[0] as HTMLInputElement).checked).toBe(false);
  });

  it('sanitizes brightness slider values before updating theme state', () => {
    render(<GeneralSettings />);

    const brightnessSlider = screen.getByRole('slider');
    fireEvent.change(brightnessSlider, { target: { value: '0.25' } });
    expect(mocks.setBrightness).toHaveBeenLastCalledWith(0.5);

    fireEvent.change(brightnessSlider, { target: { value: '0.75' } });
    expect(mocks.setBrightness).toHaveBeenLastCalledWith(0.75);
  });

  it('provides accessible names for display controls', () => {
    render(<GeneralSettings />);

    expect(screen.getByRole('slider', { name: 'Brightness' })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Auto suggest' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Cards per row' })).toBeInTheDocument();
  });

  it('shows an import success toast with a reload action', async () => {
    mocks.importData.mockResolvedValueOnce(undefined);
    const { container } = render(<GeneralSettings section="data" />);
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['{}'], 'backup.json', { type: 'application/json' });

    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(mocks.importData).toHaveBeenCalledWith(file);
      expect(mocks.toastSuccess).toHaveBeenCalledWith('Import succeeded', 'Reload Page', expect.any(Function));
    });
  });

  it('shows an import error toast when import fails', async () => {
    mocks.importData.mockRejectedValueOnce(new Error('bad import'));
    const { container } = render(<GeneralSettings section="data" />);
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['bad'], 'bad.json', { type: 'application/json' });

    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(mocks.toastError).toHaveBeenCalledWith('Import failed');
    });
  });
});
