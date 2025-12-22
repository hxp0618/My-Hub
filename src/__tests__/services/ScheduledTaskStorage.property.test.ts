/**
 * ScheduledTaskStorage 属性测试
 * 使用 fast-check 进行属性测试验证存储服务的正确性
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { ScheduledTaskStorage, MAX_EXECUTION_HISTORY } from '../../services/ScheduledTaskStorage';
import {
  ScheduledTask,
  TaskExecutionRecord,
  ScheduledTaskType,
  ScheduledTaskStatus,
  generateTaskId,
  generateExecutionId,
} from '../../types/scheduledTask';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();

Object.defineProperty(global, 'localStorage', { value: localStorageMock });

// Arbitraries for generating test data
const taskTypeArb: fc.Arbitrary<ScheduledTaskType> = fc.constantFrom('one-time', 'recurring');
const taskStatusArb: fc.Arbitrary<ScheduledTaskStatus> = fc.constantFrom('active', 'paused', 'completed', 'failed');

const scheduledTaskArb: fc.Arbitrary<ScheduledTask> = fc.record({
  id: fc.string({ minLength: 1, maxLength: 50 }).map(s => `task_${s}`),
  type: taskTypeArb,
  status: taskStatusArb,
  title: fc.string({ minLength: 1, maxLength: 100 }),
  body: fc.string({ minLength: 0, maxLength: 500 }),
  targetKeyIds: fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 1, maxLength: 5 }),
  options: fc.option(fc.record({
    sound: fc.option(fc.string({ maxLength: 50 })),
    icon: fc.option(fc.string({ maxLength: 200 })),
    group: fc.option(fc.string({ maxLength: 50 })),
  }), { nil: undefined }),
  scheduledTime: fc.option(fc.integer({ min: Date.now(), max: Date.now() + 365 * 24 * 60 * 60 * 1000 }), { nil: undefined }),
  cronExpression: fc.option(fc.constantFrom('* * * * *', '0 * * * *', '0 0 * * *', '0 0 * * 0'), { nil: undefined }),
  nextExecutionTime: fc.option(fc.integer({ min: Date.now(), max: Date.now() + 365 * 24 * 60 * 60 * 1000 }), { nil: undefined }),
  createdAt: fc.integer({ min: 0, max: Date.now() }),
  updatedAt: fc.integer({ min: 0, max: Date.now() }),
  lastExecutedAt: fc.option(fc.integer({ min: 0, max: Date.now() }), { nil: undefined }),
});

const executionRecordArb: fc.Arbitrary<TaskExecutionRecord> = fc.record({
  id: fc.string({ minLength: 1, maxLength: 50 }).map(s => `exec_${s}`),
  taskId: fc.string({ minLength: 1, maxLength: 50 }).map(s => `task_${s}`),
  executedAt: fc.integer({ min: 0, max: Date.now() }),
  status: fc.constantFrom('success' as const, 'failed' as const),
  errorMessage: fc.option(fc.string({ maxLength: 200 }), { nil: undefined }),
  targetKeyIds: fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 1, maxLength: 5 }),
  successCount: fc.integer({ min: 0, max: 100 }),
  failedCount: fc.integer({ min: 0, max: 100 }),
});

describe('ScheduledTaskStorage Property Tests', () => {
  let storage: ScheduledTaskStorage;

  beforeEach(() => {
    localStorageMock.clear();
    storage = new ScheduledTaskStorage();
  });

  afterEach(() => {
    localStorageMock.clear();
  });

  /**
   * Property 1: 任务序列化 Round-Trip
   * 验证: 需求 1.6, 6.1, 6.2, 6.5
   * 任务保存后再加载，数据应该完全一致
   */
  describe('Property 1: Task Serialization Round-Trip', () => {
    it('should preserve task data through save/load cycle', () => {
      fc.assert(
        fc.property(fc.array(scheduledTaskArb, { minLength: 0, maxLength: 20 }), (tasks) => {
          // 确保 ID 唯一
          const uniqueTasks = tasks.map((task, index) => ({
            ...task,
            id: `task_${index}_${task.id}`,
          }));

          // Save tasks
          storage.saveTasks(uniqueTasks);

          // Load tasks
          const loadedTasks = storage.loadTasks();

          // Verify count
          expect(loadedTasks.length).toBe(uniqueTasks.length);

          // Verify each task
          for (const originalTask of uniqueTasks) {
            const loadedTask = loadedTasks.find(t => t.id === originalTask.id);
            expect(loadedTask).toBeDefined();
            if (loadedTask) {
              expect(loadedTask.type).toBe(originalTask.type);
              expect(loadedTask.status).toBe(originalTask.status);
              expect(loadedTask.title).toBe(originalTask.title);
              expect(loadedTask.body).toBe(originalTask.body);
              expect(loadedTask.targetKeyIds).toEqual(originalTask.targetKeyIds);
              expect(loadedTask.createdAt).toBe(originalTask.createdAt);
              expect(loadedTask.updatedAt).toBe(originalTask.updatedAt);
            }
          }
        }),
        { numRuns: 50 }
      );
    });

    it('should handle single task add/get round-trip', () => {
      fc.assert(
        fc.property(scheduledTaskArb, (task) => {
          // Add task
          storage.addTask(task);

          // Get task
          const loadedTask = storage.getTask(task.id);

          // Verify
          expect(loadedTask).not.toBeNull();
          if (loadedTask) {
            expect(loadedTask.id).toBe(task.id);
            expect(loadedTask.type).toBe(task.type);
            expect(loadedTask.status).toBe(task.status);
            expect(loadedTask.title).toBe(task.title);
            expect(loadedTask.body).toBe(task.body);
          }
        }),
        { numRuns: 50 }
      );
    });
  });

  /**
   * Property 10: 执行历史自动清理
   * 验证: 需求 4.3
   * 执行历史记录数量不应超过 MAX_EXECUTION_HISTORY
   */
  describe('Property 10: Execution History Auto-Cleanup', () => {
    it('should never exceed MAX_EXECUTION_HISTORY records', () => {
      fc.assert(
        fc.property(
          fc.array(executionRecordArb, { minLength: 1, maxLength: MAX_EXECUTION_HISTORY + 30 }),
          (records) => {
            // 确保 ID 唯一
            const uniqueRecords = records.map((record, index) => ({
              ...record,
              id: `exec_${index}_${record.id}`,
            }));

            // Add all records
            for (const record of uniqueRecords) {
              storage.addExecutionRecord(record);
            }

            // Load history
            const history = storage.loadExecutionHistory();

            // Verify count does not exceed limit
            expect(history.length).toBeLessThanOrEqual(MAX_EXECUTION_HISTORY);
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should keep most recent records when exceeding limit', () => {
      fc.assert(
        fc.property(
          fc.array(executionRecordArb, { minLength: MAX_EXECUTION_HISTORY + 5, maxLength: MAX_EXECUTION_HISTORY + 20 }),
          (records) => {
            // 确保 ID 唯一，并按时间排序
            const uniqueRecords = records.map((record, index) => ({
              ...record,
              id: `exec_${index}`,
              executedAt: Date.now() - (records.length - index) * 1000, // 越后面的越新
            }));

            // Add all records (最新的先添加)
            for (const record of uniqueRecords) {
              storage.addExecutionRecord(record);
            }

            // Load history
            const history = storage.loadExecutionHistory();

            // 验证保留的是最新的记录
            expect(history.length).toBe(MAX_EXECUTION_HISTORY);
            
            // 历史记录应该按时间降序排列（最新的在前）
            for (let i = 1; i < history.length; i++) {
              expect(history[i - 1].executedAt).toBeGreaterThanOrEqual(history[i].executedAt);
            }
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should cleanup history correctly per task', () => {
      fc.assert(
        fc.property(
          fc.array(fc.string({ minLength: 1, maxLength: 10 }), { minLength: 2, maxLength: 5 }),
          fc.integer({ min: 10, max: 30 }),
          (taskIds, recordsPerTask) => {
            const uniqueTaskIds = [...new Set(taskIds.map((id, i) => `task_${i}_${id}`))];
            
            // 为每个任务创建多条记录
            let recordIndex = 0;
            for (const taskId of uniqueTaskIds) {
              for (let i = 0; i < recordsPerTask; i++) {
                storage.addExecutionRecord({
                  id: `exec_${recordIndex++}`,
                  taskId,
                  executedAt: Date.now() - i * 1000,
                  status: 'success',
                  targetKeyIds: ['key1'],
                  successCount: 1,
                  failedCount: 0,
                });
              }
            }

            // 执行清理
            storage.cleanupHistory();

            // 加载历史
            const history = storage.loadExecutionHistory();

            // 验证总数不超过限制
            expect(history.length).toBeLessThanOrEqual(MAX_EXECUTION_HISTORY);
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  /**
   * 额外属性测试: 任务更新保持 ID 和创建时间不变
   */
  describe('Task Update Invariants', () => {
    it('should preserve id and createdAt on update', () => {
      fc.assert(
        fc.property(
          scheduledTaskArb,
          fc.record({
            title: fc.option(fc.string({ minLength: 1, maxLength: 100 })),
            body: fc.option(fc.string({ maxLength: 500 })),
            status: fc.option(taskStatusArb),
          }),
          (task, updates) => {
            // Add task
            storage.addTask(task);

            // Update task
            const updateParams: Partial<ScheduledTask> = {};
            if (updates.title !== null) updateParams.title = updates.title;
            if (updates.body !== null) updateParams.body = updates.body;
            if (updates.status !== null) updateParams.status = updates.status;

            const updatedTask = storage.updateTask(task.id, updateParams);

            // Verify invariants
            expect(updatedTask).not.toBeNull();
            if (updatedTask) {
              expect(updatedTask.id).toBe(task.id);
              expect(updatedTask.createdAt).toBe(task.createdAt);
              expect(updatedTask.updatedAt).toBeGreaterThanOrEqual(task.updatedAt);
            }
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  /**
   * 额外属性测试: 删除任务同时删除执行历史
   */
  describe('Task Deletion Cascades to Execution History', () => {
    it('should delete execution history when task is deleted', () => {
      fc.assert(
        fc.property(
          scheduledTaskArb,
          fc.array(executionRecordArb, { minLength: 1, maxLength: 10 }),
          (task, records) => {
            // Add task
            storage.addTask(task);

            // Add execution records for this task
            const taskRecords = records.map((record, index) => ({
              ...record,
              id: `exec_${index}`,
              taskId: task.id,
            }));

            for (const record of taskRecords) {
              storage.addExecutionRecord(record);
            }

            // Verify records exist
            const historyBefore = storage.loadExecutionHistory(task.id);
            expect(historyBefore.length).toBeGreaterThan(0);

            // Delete task
            const deleted = storage.deleteTask(task.id);
            expect(deleted).toBe(true);

            // Verify task is deleted
            expect(storage.getTask(task.id)).toBeNull();

            // Verify execution history is deleted
            const historyAfter = storage.loadExecutionHistory(task.id);
            expect(historyAfter.length).toBe(0);
          }
        ),
        { numRuns: 30 }
      );
    });
  });
});
