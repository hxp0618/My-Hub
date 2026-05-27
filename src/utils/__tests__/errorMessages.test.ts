import { afterEach, describe, expect, it } from 'vitest';
import i18n from '../../i18n';
import { getErrorMessage, getErrorMessageKey } from '../errorMessages';

describe('errorMessages', () => {
  afterEach(async () => {
    await i18n.changeLanguage('zh-CN');
  });

  it('classifies common LLM and network errors without exposing raw details', async () => {
    await i18n.changeLanguage('en');

    expect(getErrorMessageKey(new Error('HTTP 401 raw provider auth detail'))).toBe('unauthorized');
    expect(getErrorMessageKey(new Error('Too many requests: raw quota detail'))).toBe('rateLimit');
    expect(getErrorMessageKey(new Error('Failed to fetch https://secret.example.com'))).toBe('networkError');

    const message = getErrorMessage(new Error('HTTP 500 raw provider stack trace with https://secret.example.com'));
    expect(message).toEqual({
      title: 'Service Unavailable',
      message: 'The LLM service provider is experiencing issues, please try again later',
      action: 'Retry',
    });
    expect(JSON.stringify(message)).not.toContain('raw provider stack trace');
    expect(JSON.stringify(message)).not.toContain('secret.example.com');
  });

  it('uses the current locale for mapped messages', async () => {
    await i18n.changeLanguage('en');
    expect(getErrorMessage(new Error('api key not configured')).title).toBe('API Key Not Configured');

    await i18n.changeLanguage('zh-CN');
    expect(getErrorMessage(new Error('api key not configured'))).toEqual({
      title: '未配置 API Key',
      message: '请先在设置页面配置您的 LLM 服务商和 API Key',
      action: '前往设置',
      actionLink: '/settings',
    });
  });

  it('falls back to a generic localized message instead of Error.message', async () => {
    await i18n.changeLanguage('en');

    const message = getErrorMessage(new Error('raw unexpected private failure'));

    expect(message).toEqual({
      title: 'Operation Failed',
      message: 'An unknown error occurred, please try again',
    });
    expect(JSON.stringify(message)).not.toContain('raw unexpected private failure');
  });
});
