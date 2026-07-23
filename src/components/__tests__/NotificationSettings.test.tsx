import React from 'react';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_NOTIFICATION_CONFIG } from '../../types/subscription';
import { NotificationSettings } from '../NotificationSettings';

vi.mock('../../db/indexedDB', () => ({
  getSubscriptionNotificationConfig: vi.fn().mockResolvedValue(DEFAULT_NOTIFICATION_CONFIG),
  setSubscriptionNotificationConfig: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../services/BarkKeyManager', () => ({
  BarkKeyManager: class {
    getAllKeys() { return []; }
  },
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => ({
      'settings.notification.telegram.title': 'Telegram',
      'settings.notification.email.title': 'Email',
      'settings.notification.webhook.title': 'Webhook',
      'settings.notification.bark.title': 'Bark',
    }[key] ?? key),
  }),
}));

describe('NotificationSettings accessibility', () => {
  afterEach(() => cleanup());

  it('gives every notification channel switch a name and checked state', async () => {
    render(<NotificationSettings />);

    await waitFor(() => expect(screen.getAllByRole('switch')).toHaveLength(4));
    for (const channel of ['Telegram', 'Email', 'Webhook', 'Bark']) {
      expect(screen.getByRole('switch', { name: channel })).toHaveAttribute('aria-checked', 'false');
    }
  });
});
