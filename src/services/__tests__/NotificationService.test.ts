import { afterEach, describe, expect, it, vi } from 'vitest';
import notificationService from '../NotificationService';
import { getSubscriptionNotificationErrorMessage } from '../../utils/subscriptionNotificationContent';

describe('notification service error messages', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('does not expose Telegram API descriptions to users', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      json: async () => ({ ok: false, description: 'Bad Request: raw telegram detail' }),
    }));

    const result = await notificationService.testTelegram({
      enabled: true,
      botToken: 'bot-token',
      chatId: 'chat-id',
    });

    expect(result).toEqual({
      success: false,
      channel: 'telegram',
      error: getSubscriptionNotificationErrorMessage('sendFailed'),
    });
    expect(result.error).not.toContain('raw telegram detail');
  });

  it('does not expose Resend API messages to users', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ message: 'raw resend detail' }),
    }));

    const result = await notificationService.testEmail({
      enabled: true,
      resendApiKey: 'resend-key',
      recipientEmail: 'to@example.com',
    });

    expect(result).toEqual({
      success: false,
      channel: 'email',
      error: getSubscriptionNotificationErrorMessage('sendFailed'),
    });
    expect(result.error).not.toContain('raw resend detail');
  });

  it('does not expose Webhook HTTP status text to users', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
    }));

    const result = await notificationService.testWebhook({
      enabled: true,
      url: 'https://example.com/webhook',
      method: 'POST',
    });

    expect(result).toEqual({
      success: false,
      channel: 'webhook',
      error: getSubscriptionNotificationErrorMessage('sendFailed'),
    });
    expect(result.error).not.toBe('HTTP 500');
  });

  it('does not expose Bark response messages to users', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      json: async () => ({ code: 400, message: 'raw bark detail' }),
    }));

    const result = await notificationService.testBark({
      enabled: true,
      useExistingKey: false,
      server: 'https://bark.example.com',
      deviceKey: 'device-key',
    });

    expect(result).toEqual({
      success: false,
      channel: 'bark',
      error: getSubscriptionNotificationErrorMessage('sendFailed'),
    });
    expect(result.error).not.toContain('raw bark detail');
  });

  it('uses a stable network error when fetch throws raw details', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('raw socket timeout')));

    const result = await notificationService.testWebhook({
      enabled: true,
      url: 'https://example.com/webhook',
      method: 'POST',
    });

    expect(result).toEqual({
      success: false,
      channel: 'webhook',
      error: getSubscriptionNotificationErrorMessage('networkError'),
    });
    expect(result.error).not.toContain('raw socket timeout');
  });
});
