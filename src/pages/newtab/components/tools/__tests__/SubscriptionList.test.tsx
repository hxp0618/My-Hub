import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Subscription } from '../../../../../types/subscription';
import { SubscriptionList } from '../subscription/SubscriptionList';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    i18n: { language: 'en' },
    t: (key: string, options?: Record<string, string | number>) => {
      const translations: Record<string, string> = {
        'subscriptions.empty': 'No subscriptions',
        'subscriptions.emptyHint': 'Create your first subscription',
        'subscriptions.enabled': 'Enabled',
        'subscriptions.disabled': 'Disabled',
        'subscriptions.renew': 'Renew',
        'subscriptions.edit': 'Edit',
        'subscriptions.delete': 'Delete',
        'subscriptions.actionLabels.enable': `Enable ${options?.name}`,
        'subscriptions.actionLabels.disable': `Disable ${options?.name}`,
        'subscriptions.actionLabels.renew': `Renew ${options?.name}`,
        'subscriptions.actionLabels.edit': `Edit ${options?.name}`,
        'subscriptions.actionLabels.delete': `Delete ${options?.name}`,
        'subscriptions.channels.bark': 'Bark',
        'subscriptions.channels.email': 'Email',
        'subscriptions.remaining.days': `${options?.days} days`,
        'subscriptions.remaining.today': 'Expires today',
        'subscriptions.remaining.expired': `${options?.days} days overdue`,
        'subscriptions.table.name': 'Name',
        'subscriptions.table.type': 'Type',
        'subscriptions.table.cycle': 'Cycle',
        'subscriptions.table.expiryDate': 'Expiry Date',
        'subscriptions.table.reminderDays': 'Reminder',
        'subscriptions.table.notificationChannels': 'Notifications',
        'subscriptions.table.status': 'Status',
        'subscriptions.table.actions': 'Actions',
        'tools.subscriptionManager.types.video': 'Video',
        'tools.subscriptionManager.cycles.monthly': 'Monthly',
      };
      return translations[key] ?? key;
    },
  }),
}));

const createSubscription = (overrides: Partial<Subscription> = {}): Subscription => ({
  id: 'sub-1',
  name: 'Netflix',
  type: 'video',
  cycle: 'monthly',
  expiryDate: Date.now() + 10 * 24 * 60 * 60 * 1000,
  reminderDays: 7,
  notificationChannels: ['bark'],
  status: 'active',
  isEnabled: true,
  createdAt: Date.now(),
  updatedAt: Date.now(),
  ...overrides,
});

describe('SubscriptionList', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders the themed empty state', () => {
    render(
      <SubscriptionList
        subscriptions={[]}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onToggleEnabled={vi.fn()}
        onRenew={vi.fn()}
      />
    );

    expect(screen.getByText('No subscriptions').closest('.subscription-empty-state')).toBeInTheDocument();
    expect(screen.getByText('Create your first subscription')).toHaveClass('subscription-empty-hint');
  });

  it('renders accessible table actions and toggle state', () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    const onToggleEnabled = vi.fn();
    const onRenew = vi.fn();
    const subscription = createSubscription();

    render(
      <SubscriptionList
        subscriptions={[subscription]}
        onEdit={onEdit}
        onDelete={onDelete}
        onToggleEnabled={onToggleEnabled}
        onRenew={onRenew}
      />
    );

    expect(screen.getByRole('table')).toHaveClass('subscription-list-table');
    expect(screen.getByText('Netflix')).toHaveClass('subscription-list-title');

    const toggle = screen.getByRole('button', { name: 'Disable Netflix' });
    expect(toggle).toHaveClass('subscription-toggle');
    expect(toggle).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(toggle);
    fireEvent.click(screen.getByRole('button', { name: 'Renew Netflix' }));
    fireEvent.click(screen.getByRole('button', { name: 'Edit Netflix' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete Netflix' }));

    expect(onToggleEnabled).toHaveBeenCalledWith(subscription);
    expect(onRenew).toHaveBeenCalledWith(subscription);
    expect(onEdit).toHaveBeenCalledWith(subscription);
    expect(onDelete).toHaveBeenCalledWith(subscription);
  });
});
