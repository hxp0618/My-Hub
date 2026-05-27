import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TaskExecutionRecord } from '../../../../../types/scheduledTask';
import { ExecutionHistoryModal } from '../bark/ExecutionHistoryModal';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => {
      const translations: Record<string, string> = {
        'common.close': 'Close',
        'tools.barkNotifier.scheduled.historyTitle': `History for ${options?.title}`,
        'tools.barkNotifier.scheduled.status.failed': 'Failed',
        'tools.barkNotifier.scheduled.status.success': 'Success',
        'tools.barkNotifier.scheduled.successCount': `${options?.count} succeeded`,
        'tools.barkNotifier.scheduled.failedCount': `${options?.count} failed`,
        'tools.barkNotifier.scheduled.errorMessage': 'Error',
        'tools.barkNotifier.scheduled.messages.sendFailed': 'Notification send failed',
        'tools.barkNotifier.scheduled.messages.unknownError': 'An unknown error occurred',
      };
      return translations[key] ?? key;
    },
  }),
}));

const createRecord = (overrides: Partial<TaskExecutionRecord>): TaskExecutionRecord => ({
  id: 'exec_1',
  taskId: 'task_1',
  executedAt: 1,
  status: 'failed',
  targetKeyIds: ['key_1'],
  successCount: 0,
  failedCount: 1,
  ...overrides,
});

describe('ExecutionHistoryModal', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('hides legacy raw execution error messages from history records', () => {
    render(
      <ExecutionHistoryModal
        isOpen
        onClose={vi.fn()}
        taskTitle="Morning ping"
        records={[
          createRecord({
            errorMessage: 'raw bark server detail at https://api.day.app/device-key',
          }),
        ]}
      />
    );

    expect(screen.getByText(/An unknown error occurred/)).toBeInTheDocument();
    expect(screen.queryByText(/raw bark server detail/)).not.toBeInTheDocument();
    expect(screen.queryByText(/device-key/)).not.toBeInTheDocument();
  });

  it('renders localized messages for stable execution error keys', () => {
    render(
      <ExecutionHistoryModal
        isOpen
        onClose={vi.fn()}
        taskTitle="Morning ping"
        records={[
          createRecord({
            errorMessage: 'Send failed',
            errorMessageKey: 'sendFailed',
          }),
        ]}
      />
    );

    expect(screen.getByText(/Notification send failed/)).toBeInTheDocument();
  });
});
