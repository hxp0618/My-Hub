import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BarkKeyManager } from '../BarkKeyManager';
import { ScheduledTaskService } from '../ScheduledTaskService';

const createServiceWithKey = () => {
  const key = new BarkKeyManager().addKey({
    deviceKey: 'device-key',
    server: 'https://api.day.app',
    label: 'iPhone',
  });

  return {
    key,
    service: new ScheduledTaskService(),
  };
};

describe('ScheduledTaskService execution errors', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    vi.spyOn(console, 'debug').mockImplementation(() => undefined);
    vi.unstubAllGlobals();
  });

  it('stores a stable error key when target keys are missing', async () => {
    const service = new ScheduledTaskService();
    const task = service.createTask({
      type: 'one-time',
      title: 'Morning ping',
      body: 'Standup reminder',
      targetKeyIds: ['missing-key'],
      scheduledTime: Date.now() + 120_000,
    });

    const record = await service.executeTask(task.id);

    expect(record.status).toBe('failed');
    expect(record.errorMessageKey).toBe('noValidTargetKeys');
    expect(record.errorMessage).toBe('No valid target keys found');
  });

  it('does not store Bark response messages in execution history', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      json: async () => ({ code: 400, message: 'raw bark server detail' }),
    }));
    const { key, service } = createServiceWithKey();
    const task = service.createTask({
      type: 'one-time',
      title: 'Morning ping',
      body: 'Standup reminder',
      targetKeyIds: [key.id],
      scheduledTime: Date.now() + 120_000,
    });

    const record = await service.executeTask(task.id);

    expect(record.status).toBe('failed');
    expect(record.errorMessageKey).toBe('sendFailed');
    expect(record.errorMessage).toBe('Send failed');
    expect(record.errorMessage).not.toContain('raw bark server detail');
  });

  it('stores a stable network error when fetch throws raw details', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('raw socket timeout')));
    const { key, service } = createServiceWithKey();
    const task = service.createTask({
      type: 'one-time',
      title: 'Morning ping',
      body: 'Standup reminder',
      targetKeyIds: [key.id],
      scheduledTime: Date.now() + 120_000,
    });

    const record = await service.executeTask(task.id);

    expect(record.status).toBe('failed');
    expect(record.errorMessageKey).toBe('networkError');
    expect(record.errorMessage).toBe('Network error');
    expect(record.errorMessage).not.toContain('raw socket timeout');
  });

  it('does not log raw runtime errors when alarm registration is proxied', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.stubGlobal('chrome', {
      runtime: {
        sendMessage: vi.fn().mockRejectedValue(new Error('raw runtime detail with task id')),
      },
    });

    const service = new ScheduledTaskService();
    service.registerAlarm({
      id: 'task-secret',
      type: 'one-time',
      title: 'Private notification',
      body: 'Sensitive body',
      targetKeyIds: [],
      status: 'active',
      scheduledTime: Date.now() + 120_000,
      nextExecutionTime: Date.now() + 120_000,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    await Promise.resolve();

    const loggedText = JSON.stringify(warnSpy.mock.calls);
    expect(loggedText).toContain('Failed to request background alarm registration');
    expect(loggedText).not.toContain('raw runtime detail');
    expect(loggedText).not.toContain('task-secret');
  });

  it('does not log raw runtime errors when alarm cancellation is proxied', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.stubGlobal('chrome', {
      runtime: {
        sendMessage: vi.fn().mockRejectedValue(new Error('raw runtime detail with task id')),
      },
    });

    const service = new ScheduledTaskService();
    service.cancelAlarm('task-secret');

    await Promise.resolve();

    const loggedText = JSON.stringify(warnSpy.mock.calls);
    expect(loggedText).toContain('Failed to request background alarm cancellation');
    expect(loggedText).not.toContain('raw runtime detail');
    expect(loggedText).not.toContain('task-secret');
  });

  it('throws stable service errors without task identifiers', async () => {
    const service = new ScheduledTaskService();
    const secretTaskId = 'task_secret_private';

    expect(() => service.updateTask(secretTaskId, { title: 'Updated' }))
      .toThrow('taskNotFound');
    expect(() => service.deleteTask(secretTaskId))
      .toThrow('taskNotFound');
    expect(() => service.toggleTaskStatus(secretTaskId))
      .toThrow('taskNotFound');
    await expect(service.executeTask(secretTaskId))
      .rejects
      .toThrow('taskNotFound');

    const getErrorMessage = (fn: () => void): string => {
      try {
        fn();
      } catch (error) {
        return error instanceof Error ? error.message : String(error);
      }

      throw new Error('Expected function to throw');
    };

    const message = getErrorMessage(() => service.deleteTask(secretTaskId));
    expect(message).not.toContain(secretTaskId);
    expect(message).not.toContain('Task not found');
  });

  it('throws a stable error when completed tasks cannot be toggled', () => {
    const service = new ScheduledTaskService();
    const task = service.createTask({
      type: 'one-time',
      title: 'Morning ping',
      body: 'Standup reminder',
      targetKeyIds: ['missing-key'],
      scheduledTime: Date.now() + 120_000,
    });

    const stored = JSON.parse(localStorage.getItem('bark_scheduled_tasks') ?? '[]');
    localStorage.setItem('bark_scheduled_tasks', JSON.stringify([
      { ...stored[0], id: task.id, status: 'completed' },
    ]));

    expect(() => service.toggleTaskStatus(task.id))
      .toThrow('statusToggleUnavailable');
  });
});
