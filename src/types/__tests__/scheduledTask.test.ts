import { describe, expect, it } from 'vitest';
import {
  setScheduledTaskExecutionError,
  TaskExecutionRecord,
} from '../scheduledTask';

const createRecord = (): TaskExecutionRecord => ({
  id: 'exec_1',
  taskId: 'task_1',
  executedAt: 1,
  status: 'failed',
  targetKeyIds: ['key_1'],
  successCount: 0,
  failedCount: 1,
});

describe('scheduled task execution errors', () => {
  it('stores stable execution error keys and safe fallback messages', () => {
    const record = createRecord();

    setScheduledTaskExecutionError(record, 'networkError');

    expect(record.errorMessageKey).toBe('networkError');
    expect(record.errorMessage).toBe('Network error');
  });
});
