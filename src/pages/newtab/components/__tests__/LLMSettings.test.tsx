import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import LLMSettings, { hasSavedGeminiNanoPreference } from '../LLMSettings';

const mocks = vi.hoisted(() => ({
  toastSuccess: vi.fn(),
  saveLLMSettings: vi.fn(),
  testLLMConnection: vi.fn(),
}));

vi.mock('../../../../contexts/ToastContext', () => ({
  useToastContext: () => ({
    success: mocks.toastSuccess,
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
    showToast: vi.fn(),
  }),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('../../../../lib/llmUtils', async () => {
  const actual = await vi.importActual<typeof import('../../../../lib/llmUtils')>('../../../../lib/llmUtils');

  return {
    ...actual,
    getLLMSettings: () => ({
      selectedProvider: '',
      selectedModel: '',
      apiKey: '',
      customApiUrl: '',
      customModel: '',
      providers: {},
      prioritizeGeminiNano: false,
    }),
    saveLLMSettings: mocks.saveLLMSettings,
    testLLMConnection: mocks.testLLMConnection,
  };
});

describe('LLMSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mocks.testLLMConnection.mockResolvedValue(undefined);
  });

  it('uses toast feedback instead of a blocking alert when saving settings', async () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => undefined);

    render(<LLMSettings />);

    fireEvent.click(screen.getByRole('button', { name: 'settings.saveButton' }));

    expect(mocks.saveLLMSettings).toHaveBeenCalledTimes(1);
    expect(mocks.toastSuccess).toHaveBeenCalledWith('settings.settingsSavedAlert');
    expect(alertSpy).not.toHaveBeenCalled();
  });

  it('detects saved Gemini Nano preference without trusting malformed settings', () => {
    expect(hasSavedGeminiNanoPreference()).toBe(false);

    localStorage.setItem('llm_settings', '{bad-json');
    expect(hasSavedGeminiNanoPreference()).toBe(false);

    localStorage.setItem('llm_settings', JSON.stringify({ selectedProvider: 'openai' }));
    expect(hasSavedGeminiNanoPreference()).toBe(false);

    localStorage.setItem('llm_settings', JSON.stringify({ prioritizeGeminiNano: false }));
    expect(hasSavedGeminiNanoPreference()).toBe(true);
  });

  it('uses a localized generic error for unexpected connection test failures', async () => {
    mocks.testLLMConnection.mockRejectedValueOnce(new Error('raw provider secret failure'));

    render(<LLMSettings />);

    fireEvent.change(screen.getByLabelText('settings.providerLabel'), {
      target: { value: 'custom' },
    });
    fireEvent.change(screen.getByLabelText('settings.apiKeyLabel'), {
      target: { value: 'test-key' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'settings.testConnectionButton' }));

    expect(await screen.findByText('settings.connectionFailedMsg')).toBeInTheDocument();
    expect(screen.queryByText(/raw provider secret failure/)).not.toBeInTheDocument();
  });
});
