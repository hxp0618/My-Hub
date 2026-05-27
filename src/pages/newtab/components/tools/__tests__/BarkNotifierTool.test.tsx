import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  BarkNotifierTool,
  getScheduledTaskErrorMessage,
  sanitizeBarkHistoryRecords,
} from '../BarkNotifierTool';
import { ScheduledTask } from '../../../../../types/scheduledTask';

vi.mock('react-i18next', () => ({
  initReactI18next: {
    type: '3rdParty',
    init: vi.fn(),
  },
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => {
      const translations: Record<string, string> = {
        'common.cancel': 'Cancel',
        'common.delete': 'Delete',
        'tools.barkNotifier.clearAll': 'Clear All',
        'tools.barkNotifier.deleteConfirm': 'Clear all history?',
        'tools.barkNotifier.error': 'Send failed',
        'tools.barkNotifier.errors.sendFailed': 'Notification send failed',
        'tools.barkNotifier.errors.networkError': 'Network error. Please try again later.',
        'tools.barkNotifier.keys.title': 'Key Management',
        'tools.barkNotifier.send': 'Send',
        'tools.barkNotifier.scheduled.title': 'Scheduled Tasks',
        'tools.barkNotifier.scheduled.list.delete': 'Delete',
        'tools.barkNotifier.scheduled.list.deleteConfirm': `Delete scheduled task "${options?.title}"?`,
        'tools.barkNotifier.scheduled.messages.deleteSuccess': 'Task deleted',
        'tools.barkNotifier.scheduled.taskCount': `Scheduled Tasks (${options?.count})`,
        'tools.barkNotifier.titlePlaceholder': 'Notification title',
        'tools.barkNotifier.bodyPlaceholder': 'Notification body',
      };
      return translations[key] ?? key;
    },
  }),
}));

const createTask = (): ScheduledTask => ({
  id: 'task_1',
  type: 'one-time',
  status: 'active',
  title: 'Morning ping',
  body: 'Standup reminder',
  targetKeyIds: ['key_1'],
  scheduledTime: Date.now() + 60_000,
  nextExecutionTime: Date.now() + 60_000,
  createdAt: Date.now(),
  updatedAt: Date.now(),
});

describe('BarkNotifierTool confirmations', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('uses the app confirmation dialog when clearing notification history', () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    localStorage.setItem('bark_notification_history', JSON.stringify([
      {
        id: 'history_1',
        title: 'Hello',
        body: 'World',
        status: 'success',
        timestamp: Date.now(),
      },
    ]));

    render(<BarkNotifierTool isExpanded onToggleExpand={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Clear All' }));

    expect(confirmSpy).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Clear all history?')).toBeInTheDocument();

    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Clear All' }));

    expect(localStorage.getItem('bark_notification_history')).toBeNull();
  });

  it('uses the app confirmation dialog when deleting a scheduled task', () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    localStorage.setItem('bark_scheduled_tasks', JSON.stringify([createTask()]));

    render(<BarkNotifierTool isExpanded onToggleExpand={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: /Scheduled Tasks/ }));
    fireEvent.click(screen.getByTitle('Delete'));

    expect(confirmSpy).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Delete scheduled task "Morning ping"?')).toBeInTheDocument();

    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete' }));

    expect(JSON.parse(localStorage.getItem('bark_scheduled_tasks') ?? '[]')).toEqual([]);
  });

  it('sanitizes notification history records before rendering or saving', () => {
    const records = sanitizeBarkHistoryRecords([
      {
        id: 'history_1',
        title: 'Hello',
        body: 'World',
        status: 'success',
        timestamp: 100,
        errorMessage: 404,
        options: {
          sound: '',
          icon: 'https://example.com/icon.png',
          group: 42,
        },
      },
      {
        id: 'history_2',
        title: 'Bad status',
        body: '',
        status: 'pending',
        timestamp: 101,
      },
      {
        id: 'history_3',
        title: 'Bad time',
        body: '',
        status: 'failed',
        timestamp: Number.NaN,
      },
      {
        id: 'history_4',
        title: 'Failed',
        body: 'Body',
        status: 'failed',
        timestamp: 102,
        errorMessage: 'Send failed',
        errorMessageKey: 'sendFailed',
      },
      null,
    ]);

    expect(records).toEqual([
      {
        id: 'history_1',
        title: 'Hello',
        body: 'World',
        status: 'success',
        timestamp: 100,
        options: {
          sound: '',
          icon: 'https://example.com/icon.png',
        },
      },
      {
        id: 'history_4',
        title: 'Failed',
        body: 'Body',
        status: 'failed',
        timestamp: 102,
        errorMessage: 'Send failed',
        errorMessageKey: 'sendFailed',
      },
    ]);
  });

  it('uses stable localized errors for failed instant sends', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      json: async () => ({ code: 400, message: 'raw bark server detail' }),
    }));
    localStorage.setItem('bark_keys', JSON.stringify([
      {
        id: 'key_1',
        deviceKey: 'device-key',
        server: 'https://api.day.app',
        label: 'iPhone',
        createdAt: 1,
        updatedAt: 2,
      },
    ]));
    localStorage.setItem('bark_selected_key_id', 'key_1');

    render(<BarkNotifierTool isExpanded onToggleExpand={vi.fn()} />);

    fireEvent.change(screen.getByPlaceholderText('Notification title'), {
      target: { value: 'Hello' },
    });
    fireEvent.change(screen.getByPlaceholderText('Notification body'), {
      target: { value: 'World' },
    });
    const sendButton = screen.getByRole('button', { name: 'Send' });

    await waitFor(() => expect(sendButton).toBeEnabled());
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(screen.getByText('Send failed: Notification send failed')).toBeInTheDocument();
    });
    expect(screen.queryByText(/raw bark server detail/)).not.toBeInTheDocument();

    const history = JSON.parse(localStorage.getItem('bark_notification_history') ?? '[]');
    expect(history[0].errorMessageKey).toBe('sendFailed');
    expect(history[0].errorMessage).toBe('Notification send failed');
  });

  it('falls back to an empty history when stored history is malformed', () => {
    localStorage.setItem('bark_notification_history', '{bad-json');

    render(<BarkNotifierTool isExpanded onToggleExpand={vi.fn()} />);

    expect(screen.getByText('tools.barkNotifier.noHistory')).toBeInTheDocument();
  });

  it('maps scheduled task service errors to localized messages', () => {
    const translate = (key: string) => ({
      'tools.barkNotifier.scheduled.validation.titleRequired': 'Please enter notification title',
      'tools.barkNotifier.scheduled.validation.bodyRequired': 'Please enter notification content',
      'tools.barkNotifier.scheduled.messages.taskNotFound': 'Scheduled task was not found',
      'tools.barkNotifier.scheduled.messages.saveFailed': 'Failed to save scheduled task',
    }[key] ?? key);

    expect(getScheduledTaskErrorMessage(
      new Error('tools.barkNotifier.scheduled.validation.titleRequired, tools.barkNotifier.scheduled.validation.bodyRequired'),
      translate,
      'tools.barkNotifier.scheduled.messages.saveFailed',
    )).toBe('Please enter notification title; Please enter notification content');

    expect(getScheduledTaskErrorMessage(
      new Error('taskNotFound'),
      translate,
      'tools.barkNotifier.scheduled.messages.saveFailed',
    )).toBe('Scheduled task was not found');

    expect(getScheduledTaskErrorMessage(
      new Error('Task not found'),
      translate,
      'tools.barkNotifier.scheduled.messages.saveFailed',
    )).toBe('Scheduled task was not found');

    expect(getScheduledTaskErrorMessage(
      new Error('Unexpected service failure'),
      translate,
      'tools.barkNotifier.scheduled.messages.saveFailed',
    )).toBe('Failed to save scheduled task');
  });
});
