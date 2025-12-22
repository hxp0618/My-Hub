/**
 * ScheduledTaskService 属性测试
 * 使用 fast-check 进行属性测试验证调度服务的正确性
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { ScheduledTaskService } from '../../services/ScheduledTaskService';
import {
  ScheduledTask,
  CreateTaskParams,
  ScheduledTaskType,
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

// Mock chrome.alarms API
const mockAlarms = new Map<string, chrome.alarms.Alarm>();
const chromeMock = {
  alarms: {
    create: vi.fn((name: string, alarmInfo: chrome.alarms.AlarmCreateInfo) => {
      mockAlarms.set(name, {
        name,
        scheduledTime: alarmInfo.when || Date.now() + (alarmInfo.delayInMinutes || 0) * 60000,
      });
    }),
    clear: vi.fn((name: string) => {
      mockAlarms.delete(name);
      return Promise.resolve(true);
    }),
    get: vi.fn((name: string) => {
      return Promise.resolve(mockAlarms.get(name));
    }),
    getAll: vi.fn(() => {
      return Promise.resolve(Array.from(mockAlarms.values()));
    }),
  },
};

Object.defineProperty(global, 'chrome', { value: chromeMock });

// Mock BarkKeyManager
vi.mock('../../services/BarkKeyManager', () => ({
  BarkKeyManager: class MockBarkKeyManager {
    getAllKeys() {
      return [
        { id: 'key1', name: 'Device 1', server: 'https://api.day.app', deviceKey: 'test-key-1' },
        { id: 'key2', name: 'Device 2', server: 'https://api.day.app', deviceKey: 'test-key-2' },
      ];
    }
  },
}));

// Mock fetch for notification sending
global.fetch = vi.fn(() =>
  Promise.resolve({
    json: () => Promise.resolve({ code: 200, message: 'success' }),
  } as Response)
);

// 有效的 Cron 表达式
const validCronExpressions = [
  '* * * * *',
  '0 * * * *',
  '0 0 * * *',
  '0 9 * * 1-5',
  '*/15 * * * *',
];

// Arbitraries
const validCronArb = fc.constantFrom(...validCronExpressions);
const futureTimeArb = fc.integer({ min: Date.now() + 2 * 60 * 1000, max: Date.now() + 365 * 24 * 60 * 60 * 1000 });

// 有效的一次性任务参数生成器
const validOneTimeParamsArb: fc.Arbitrary<CreateTaskParams> = fc.record({
  type: fc.constant('one-time' as const),
  title: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
  body: fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0),
  targetKeyIds: fc.constant(['key1']),
  scheduledTime: futureTimeArb,
});

// 有效的周期性任务参数生成器
const validRecurringParamsArb: fc.Arbitrary<CreateTaskParams> = fc.record({
  type: fc.constant('recurring' as const),
  title: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
  body: fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0),
  targetKeyIds: fc.constant(['key1']),
  cronExpression: validCronArb,
});

describe('ScheduledTaskService Property Tests', () => {
  let service: ScheduledTaskService;

  beforeEach(() => {
    localStorageMock.clear();
    mockAlarms.clear();
    vi.clearAllMocks();
    service = new ScheduledTaskService();
  });

  afterEach(() => {
    localStorageMock.clear();
    mockAlarms.clear();
  });

  /**
   * Property 2: 任务创建类型正确性
   * 验证: 需求 1.2, 1.3
   */
  describe('Property 2: Task Creation Type Correctness', () => {
    it('should create one-time task with correct type when scheduledTime is provided', () => {
      fc.assert(
        fc.property(validOneTimeParamsArb, (params) => {
          const task = service.createTask(params);
          
          expect(task.type).toBe('one-time');
          expect(task.scheduledTime).toBe(params.scheduledTime);
          expect(task.cronExpression).toBeUndefined();
          expect(task.status).toBe('active');
        }),
        { numRuns: 30 }
      );
    });

    it('should create recurring task with correct type when cronExpression is provided', () => {
      fc.assert(
        fc.property(validRecurringParamsArb, (params) => {
          const task = service.createTask(params);
          
          expect(task.type).toBe('recurring');
          expect(task.cronExpression).toBe(params.cronExpression);
          expect(task.scheduledTime).toBeUndefined();
          expect(task.status).toBe('active');
        }),
        { numRuns: 30 }
      );
    });

    it('should calculate nextExecutionTime for created tasks', () => {
      fc.assert(
        fc.property(
          fc.oneof(validOneTimeParamsArb, validRecurringParamsArb),
          (params) => {
            const task = service.createTask(params);
            
            expect(task.nextExecutionTime).toBeDefined();
            expect(task.nextExecutionTime).toBeGreaterThan(Date.now());
          }
        ),
        { numRuns: 30 }
      );
    });
  });

  /**
   * Property 5: 任务删除正确性
   * 验证: 需求 2.5
   */
  describe('Property 5: Task Deletion Correctness', () => {
    it('should remove task from storage after deletion', () => {
      fc.assert(
        fc.property(
          fc.oneof(validOneTimeParamsArb, validRecurringParamsArb),
          (params) => {
            // Create task
            const task = service.createTask(params);
            const taskId = task.id;
            
            // Verify task exists
            const allTasksBefore = service.getAllTasks();
            expect(allTasksBefore.some(t => t.id === taskId)).toBe(true);
            
            // Delete task
            service.deleteTask(taskId);
            
            // Verify task is removed
            const allTasksAfter = service.getAllTasks();
            expect(allTasksAfter.some(t => t.id === taskId)).toBe(false);
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should cancel alarm when task is deleted', () => {
      fc.assert(
        fc.property(validOneTimeParamsArb, (params) => {
          // Create task
          const task = service.createTask(params);
          const alarmName = `bark_scheduled_${task.id}`;
          
          // Verify alarm was created
          expect(chromeMock.alarms.create).toHaveBeenCalled();
          
          // Delete task
          service.deleteTask(task.id);
          
          // Verify alarm was cleared
          expect(chromeMock.alarms.clear).toHaveBeenCalledWith(alarmName);
        }),
        { numRuns: 20 }
      );
    });

    it('should throw error when deleting non-existent task', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 10, maxLength: 30 }),
          (fakeId) => {
            expect(() => service.deleteTask(fakeId)).toThrow('Task not found');
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  /**
   * Property 6: 任务状态切换正确性
   * 验证: 需求 2.6
   */
  describe('Property 6: Task Status Toggle Correctness', () => {
    it('should toggle active task to paused', () => {
      fc.assert(
        fc.property(
          fc.oneof(validOneTimeParamsArb, validRecurringParamsArb),
          (params) => {
            // Create active task
            const task = service.createTask(params);
            expect(task.status).toBe('active');
            
            // Toggle to paused
            const pausedTask = service.toggleTaskStatus(task.id);
            expect(pausedTask.status).toBe('paused');
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should toggle paused task to active', () => {
      fc.assert(
        fc.property(
          fc.oneof(validOneTimeParamsArb, validRecurringParamsArb),
          (params) => {
            // Create and pause task
            const task = service.createTask(params);
            service.toggleTaskStatus(task.id); // pause
            
            // Toggle back to active
            const activeTask = service.toggleTaskStatus(task.id);
            expect(activeTask.status).toBe('active');
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should cancel alarm when pausing task', () => {
      fc.assert(
        fc.property(validOneTimeParamsArb, (params) => {
          const task = service.createTask(params);
          const alarmName = `bark_scheduled_${task.id}`;
          
          vi.clearAllMocks();
          
          // Pause task
          service.toggleTaskStatus(task.id);
          
          // Verify alarm was cleared
          expect(chromeMock.alarms.clear).toHaveBeenCalledWith(alarmName);
        }),
        { numRuns: 20 }
      );
    });

    it('should register alarm when resuming task', () => {
      fc.assert(
        fc.property(validRecurringParamsArb, (params) => {
          const task = service.createTask(params);
          
          // Pause task
          service.toggleTaskStatus(task.id);
          vi.clearAllMocks();
          
          // Resume task
          service.toggleTaskStatus(task.id);
          
          // Verify alarm was created
          expect(chromeMock.alarms.create).toHaveBeenCalled();
        }),
        { numRuns: 20 }
      );
    });
  });

  /**
   * Property 7: 一次性任务完成标记
   * 验证: 需求 3.3
   */
  describe('Property 7: One-Time Task Completion Marking', () => {
    it('should mark one-time task as completed after successful execution', async () => {
      await fc.assert(
        fc.asyncProperty(validOneTimeParamsArb, async (params) => {
          const task = service.createTask(params);
          
          // Execute task
          const record = await service.executeTask(task.id);
          
          // Verify execution was successful
          expect(record.status).toBe('success');
          
          // Verify task is marked as completed
          const updatedTask = service.getAllTasks().find(t => t.id === task.id);
          expect(updatedTask?.status).toBe('completed');
        }),
        { numRuns: 20 }
      );
    });

    it('should clear nextExecutionTime for completed one-time task', async () => {
      await fc.assert(
        fc.asyncProperty(validOneTimeParamsArb, async (params) => {
          const task = service.createTask(params);
          
          // Execute task
          await service.executeTask(task.id);
          
          // Verify nextExecutionTime is cleared
          const updatedTask = service.getAllTasks().find(t => t.id === task.id);
          expect(updatedTask?.nextExecutionTime).toBeUndefined();
        }),
        { numRuns: 20 }
      );
    });
  });

  /**
   * Property 9: 执行历史记录完整性
   * 验证: 需求 4.1
   */
  describe('Property 9: Execution History Record Completeness', () => {
    it('should create execution record with all required fields', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.oneof(validOneTimeParamsArb, validRecurringParamsArb),
          async (params) => {
            const task = service.createTask(params);
            
            // Execute task
            const record = await service.executeTask(task.id);
            
            // Verify record has all required fields
            expect(record.id).toBeDefined();
            expect(record.taskId).toBe(task.id);
            expect(record.executedAt).toBeDefined();
            expect(record.executedAt).toBeLessThanOrEqual(Date.now());
            expect(record.status).toMatch(/^(success|failed)$/);
            expect(record.targetKeyIds).toEqual(task.targetKeyIds);
            expect(typeof record.successCount).toBe('number');
            expect(typeof record.failedCount).toBe('number');
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should persist execution record in history', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.oneof(validOneTimeParamsArb, validRecurringParamsArb),
          async (params) => {
            const task = service.createTask(params);
            
            // Execute task
            const record = await service.executeTask(task.id);
            
            // Verify record is in history
            const history = service.getExecutionHistory(task.id);
            expect(history.some(h => h.id === record.id)).toBe(true);
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should update task lastExecutedAt after execution', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.oneof(validOneTimeParamsArb, validRecurringParamsArb),
          async (params) => {
            const task = service.createTask(params);
            const beforeExecution = Date.now();
            
            // Execute task
            await service.executeTask(task.id);
            
            // Verify lastExecutedAt is updated
            const updatedTask = service.getAllTasks().find(t => t.id === task.id);
            expect(updatedTask?.lastExecutedAt).toBeDefined();
            expect(updatedTask?.lastExecutedAt).toBeGreaterThanOrEqual(beforeExecution);
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  /**
   * 额外测试: 周期性任务执行后更新下次执行时间
   */
  describe('Recurring Task Next Execution Update', () => {
    it('should update nextExecutionTime for recurring task after execution', async () => {
      await fc.assert(
        fc.asyncProperty(validRecurringParamsArb, async (params) => {
          const task = service.createTask(params);
          const originalNextTime = task.nextExecutionTime;
          
          // Execute task
          await service.executeTask(task.id);
          
          // Verify nextExecutionTime is updated (should be different from original)
          const updatedTask = service.getAllTasks().find(t => t.id === task.id);
          expect(updatedTask?.nextExecutionTime).toBeDefined();
          // 周期性任务执行后应该有新的下次执行时间
          expect(updatedTask?.status).toBe('active');
        }),
        { numRuns: 20 }
      );
    });
  });
});
