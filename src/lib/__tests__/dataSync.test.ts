import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  importData,
  mergeBarkKeysForImport,
  mergeLLMSettingsForImport,
  mergeSubscriptionNotificationConfigForImport,
  redactBarkKeys,
  redactLLMSettings,
  redactSubscriptionNotificationConfig,
} from '../dataSync';
import type { LLMSettings } from '../../types/llm';
import type { BarkKeyConfig } from '../../types/bark';
import type { SubscriptionNotificationConfig } from '../../types/subscription';

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('dataSync import/export UI boundary', () => {
  it('rejects invalid import files without using blocking alerts', async () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => undefined);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const file = new File(['{invalid'], 'bad-backup.json', { type: 'application/json' });

    await expect(importData(file)).rejects.toBeInstanceOf(Error);

    expect(alertSpy).not.toHaveBeenCalled();
  });

  it('skips invalid layout settings during import', async () => {
    vi.stubGlobal('chrome', {
      bookmarks: {
        getTree: vi.fn().mockResolvedValue([{ children: [] }]),
      },
    });
    localStorage.setItem('bookmark-folder-state-old-folder', 'true');
    const file = new File([
      JSON.stringify({
        bookmarks: [],
        tags: [],
        combos: [
          { id: 'combo-1', title: 'Docs', urls: ['https://example.com'] },
          { id: 'combo-bad', title: 'Broken', urls: 'https://example.com' },
        ],
        noMoreDisplayed: ['https://hidden.example', 42],
        settings: {
          cardsPerRow: 999,
          autoSuggestBookmarkInfo: 'true',
          sidebarWidth: 9999,
          bookmarkSidebarCollapsed: 'true',
          language: 'fr',
          theme: 'sepia',
          bookmarkSortOrder: { key: 'unknown', order: 'sideways' },
          homeItemOrder: ['https://example.com', 42],
          bookmarkFolderStates: {
            'valid-folder': false,
            'invalid-folder': 'false',
            '': true,
          },
        },
      }),
    ], 'backup.json', { type: 'application/json' });

    await importData(file);

    expect(localStorage.getItem('sidebarWidth')).toBeNull();
    expect(localStorage.getItem('bookmark-sidebar-collapsed')).toBeNull();
    expect(localStorage.getItem('language')).toBeNull();
    expect(localStorage.getItem('cardsPerRow')).toBeNull();
    expect(localStorage.getItem('autoSuggestBookmarkInfo')).toBeNull();
    expect(localStorage.getItem('theme')).toBeNull();
    expect(localStorage.getItem('bookmark_sort_order')).toBeNull();
    expect(localStorage.getItem('homeItemOrder')).toBeNull();
    expect(localStorage.getItem('bookmark-folder-state-old-folder')).toBeNull();
    expect(localStorage.getItem('bookmark-folder-state-valid-folder')).toBe('false');
    expect(localStorage.getItem('bookmark-folder-state-invalid-folder')).toBeNull();
    expect(JSON.parse(localStorage.getItem('webCombos') ?? '[]')).toEqual([
      { id: 'combo-1', title: 'Docs', urls: ['https://example.com'] },
    ]);
    expect(JSON.parse(localStorage.getItem('noMoreDisplayed') ?? '[]')).toEqual([]);
  });
});

describe('dataSync redaction helpers', () => {
  it('removes LLM API keys without mutating provider settings', () => {
    const settings: LLMSettings = {
      prioritizeGeminiNano: false,
      selectedProvider: 'openrouter',
      selectedModel: 'gpt-5-mini',
      apiKey: 'root-secret',
      customApiUrl: 'https://api.example.com/v1/chat/completions',
      providers: {
        openrouter: {
          name: 'OpenRouter',
          baseUrl: 'https://openrouter.ai/api/v1/chat/completions',
          apiKey: 'provider-secret',
          selectedModel: 'gpt-5-mini',
          models: [{ value: 'gpt-5-mini', label: 'GPT-5 Mini' }],
        },
      },
    };

    const redacted = redactLLMSettings(settings);

    expect(redacted.apiKey).toBe('');
    expect(redacted.providers.openrouter.apiKey).toBe('');
    expect(redacted.providers.openrouter.selectedModel).toBe('gpt-5-mini');
    expect(settings.apiKey).toBe('root-secret');
    expect(settings.providers.openrouter.apiKey).toBe('provider-secret');
  });

  it('removes Bark device keys while preserving labels and selection metadata', () => {
    const keys: BarkKeyConfig[] = [
      {
        id: 'bark_key_1',
        deviceKey: 'device-secret',
        server: 'https://api.day.app',
        label: 'Phone',
        createdAt: 1,
        updatedAt: 2,
      },
    ];

    const redacted = redactBarkKeys(keys);

    expect(redacted).toEqual([
      {
        ...keys[0],
        deviceKey: '',
      },
    ]);
    expect(keys[0].deviceKey).toBe('device-secret');
  });

  it('disables subscription notification channels and clears channel secrets', () => {
    const config: SubscriptionNotificationConfig = {
      telegram: {
        enabled: true,
        botToken: 'telegram-token',
        chatId: 'chat-id',
      },
      email: {
        enabled: true,
        resendApiKey: 'resend-key',
        recipientEmail: 'user@example.com',
        senderEmail: 'sender@example.com',
      },
      webhook: {
        enabled: true,
        url: 'https://hooks.example.com/secret',
        method: 'POST',
        headers: {
          Authorization: 'Bearer webhook-token',
        },
      },
      bark: {
        enabled: true,
        useExistingKey: false,
        existingKeyId: 'bark_key_1',
        server: 'https://api.day.app',
        deviceKey: 'bark-secret',
      },
    };

    const redacted = redactSubscriptionNotificationConfig(config);

    expect(redacted.telegram).toMatchObject({ enabled: false, botToken: '', chatId: '' });
    expect(redacted.email).toMatchObject({
      enabled: false,
      resendApiKey: '',
      recipientEmail: '',
      senderEmail: '',
    });
    expect(redacted.webhook).toMatchObject({ enabled: false, url: '', method: 'POST' });
    expect(redacted.webhook.headers).toBeUndefined();
    expect(redacted.bark).toMatchObject({
      enabled: false,
      useExistingKey: false,
      server: '',
      deviceKey: '',
    });
    expect(redacted.bark.existingKeyId).toBeUndefined();

    // 原配置可能仍在当前浏览器环境继续使用，脱敏导出不能原地破坏它。
    expect(config.telegram.botToken).toBe('telegram-token');
    expect(config.webhook.headers?.Authorization).toBe('Bearer webhook-token');
    expect(config.bark.deviceKey).toBe('bark-secret');
  });
});

describe('dataSync safe import merge helpers', () => {
  const createLLMSettings = (apiKey: string, providerApiKey: string): LLMSettings => ({
    prioritizeGeminiNano: false,
    selectedProvider: 'openrouter',
    selectedModel: 'gpt-5-mini',
    apiKey,
    providers: {
      openrouter: {
        name: 'OpenRouter',
        baseUrl: 'https://openrouter.ai/api/v1/chat/completions',
        apiKey: providerApiKey,
        selectedModel: 'gpt-5-mini',
        models: [],
      },
    },
  });

  it('preserves existing LLM keys when importing a redacted safe export', () => {
    const existing = createLLMSettings('existing-root-key', 'existing-provider-key');
    const incoming = createLLMSettings('', '');

    const merged = mergeLLMSettingsForImport(incoming, existing);

    expect(merged.apiKey).toBe('existing-root-key');
    expect(merged.providers.openrouter.apiKey).toBe('existing-provider-key');
  });

  it('uses incoming LLM keys when importing a full sensitive export', () => {
    const existing = createLLMSettings('existing-root-key', 'existing-provider-key');
    const incoming = createLLMSettings('incoming-root-key', 'incoming-provider-key');

    const merged = mergeLLMSettingsForImport(incoming, existing);

    expect(merged.apiKey).toBe('incoming-root-key');
    expect(merged.providers.openrouter.apiKey).toBe('incoming-provider-key');
  });

  it('preserves existing Bark secrets by id and drops unusable redacted keys', () => {
    const existingKeys: BarkKeyConfig[] = [
      {
        id: 'bark_key_existing',
        deviceKey: 'existing-device-secret',
        server: 'https://api.day.app',
        label: 'Existing Phone',
        createdAt: 1,
        updatedAt: 2,
      },
    ];
    const incomingKeys: BarkKeyConfig[] = [
      {
        ...existingKeys[0],
        label: 'Imported Phone Label',
        deviceKey: '',
      },
      {
        id: 'bark_key_redacted_only',
        deviceKey: '',
        server: 'https://api.day.app',
        label: 'No Secret Available',
        createdAt: 3,
        updatedAt: 4,
      },
    ];

    const merged = mergeBarkKeysForImport(incomingKeys, existingKeys);

    expect(merged).toEqual([
      {
        ...incomingKeys[0],
        deviceKey: 'existing-device-secret',
      },
    ]);
  });

  it('preserves existing notification config when incoming config is a redacted safe export', () => {
    const existingConfig: SubscriptionNotificationConfig = {
      telegram: {
        enabled: true,
        botToken: 'telegram-token',
        chatId: 'chat-id',
      },
      email: {
        enabled: true,
        resendApiKey: 'resend-key',
        recipientEmail: 'user@example.com',
        senderEmail: 'sender@example.com',
      },
      webhook: {
        enabled: true,
        url: 'https://hooks.example.com/secret',
        method: 'POST',
        headers: {
          Authorization: 'Bearer webhook-token',
        },
      },
      bark: {
        enabled: true,
        useExistingKey: true,
        existingKeyId: 'bark_key_1',
      },
    };
    const redactedConfig = redactSubscriptionNotificationConfig(existingConfig);

    const merged = mergeSubscriptionNotificationConfigForImport(redactedConfig, existingConfig);

    expect(merged).toBe(existingConfig);
  });
});
