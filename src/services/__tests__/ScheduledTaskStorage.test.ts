import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ScheduledTaskStorage, STORAGE_KEY, EXECUTION_HISTORY_KEY } from '../ScheduledTaskStorage';
import { ScheduledTask, TaskExecutionRecord } from '../../types/scheduledTask';

const createTask = (overrides: Partial<ScheduledTask> = {}): ScheduledTask => ({
  id: 'task_1',
  type: 'one-time',
  status: 'active',
  title: 'Morning ping',
  body: 'Standup reminder',
  targetKeyIds: ['key_1'],
  scheduledTime: 100,
  nextExecutionTime: 100,
  createdAt: 1,
  updatedAt: 2,
  ...overrides,
});

const createExecutionRecord = (index: number): TaskExecutionRecord => ({
  id: `exec_${index}`,
  taskId: 'task_1',
  executedAt: index,
  status: 'success',
  targetKeyIds: ['key_1'],
  successCount: 1,
  failedCount: 0,
});

describe('ScheduledTaskStorage', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('falls back to an empty task list when stored data is corrupted', () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    localStorage.setItem(STORAGE_KEY, '{invalid');

    const storage = new ScheduledTaskStorage();

    expect(storage.loadTasks()).toEqual([]);
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it('filters invalid scheduled tasks from stored data and before saving', () => {
    const storage = new ScheduledTaskStorage();
    localStorage.setItem(STORAGE_KEY, JSON.stringify([
      createTask(),
      createTask({ id: 'task_bad_keys', targetKeyIds: ['key_1', 42] as unknown as string[] }),
      createTask({ id: 'task_bad_time', nextExecutionTime: Number.NaN }),
      createTask({ id: 'task_bad_options', options: { icon: 123 } as unknown as ScheduledTask['options'] }),
    ]));

    expect(storage.loadTasks()).toEqual([createTask()]);

    storage.saveTasks([
      createTask({ id: 'task_saved' }),
      createTask({ id: 'task_invalid_saved', targetKeyIds: [false] as unknown as string[] }),
    ]);

    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')).toEqual([
      createTask({ id: 'task_saved' }),
    ]);
  });

  it('keeps execution history within the configured storage limit', () => {
    const storage = new ScheduledTaskStorage();

    for (let index = 0; index < 55; index += 1) {
      storage.addExecutionRecord(createExecutionRecord(index));
    }

    const history = storage.loadExecutionHistory();

    expect(history).toHaveLength(50);
    expect(history[0].id).toBe('exec_54');
    expect(history[49].id).toBe('exec_5');
  });

  it('filters invalid execution history records from stored data and before saving', () => {
    const storage = new ScheduledTaskStorage();
    localStorage.setItem(EXECUTION_HISTORY_KEY, JSON.stringify([
      createExecutionRecord(1),
      { ...createExecutionRecord(2), targetKeyIds: ['key_1', null] },
      { ...createExecutionRecord(3), executedAt: Number.NaN },
      { ...createExecutionRecord(4), errorMessage: 500 },
      { ...createExecutionRecord(5), errorMessageKey: 'rawServerMessage' },
    ]));

    expect(storage.loadExecutionHistory()).toEqual([createExecutionRecord(1)]);

    storage.addExecutionRecord({
      ...createExecutionRecord(5),
      failedCount: Number.NaN,
    });

    expect(storage.loadExecutionHistory()).toEqual([createExecutionRecord(1)]);
  });

  it('preserves stable execution error keys in history records', () => {
    const storage = new ScheduledTaskStorage();
    const record = {
      ...createExecutionRecord(6),
      status: 'failed' as const,
      failedCount: 1,
      errorMessage: 'Send failed',
      errorMessageKey: 'sendFailed' as const,
    };

    storage.addExecutionRecord(record);

    expect(storage.loadExecutionHistory()).toEqual([record]);
  });
});
