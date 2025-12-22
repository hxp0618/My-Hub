/**
 * scheduledTaskValidator 属性测试
 * 使用 fast-check 进行属性测试验证验证器的正确性
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  validateCreateParams,
  validateOneTimeSchedule,
  validateCronExpression,
  calculateNextExecutionTime,
  getExecutionPreview,
} from '../../utils/scheduledTaskValidator';
import {
  CreateTaskParams,
  ScheduledTask,
  ScheduledTaskType,
} from '../../types/scheduledTask';

// 有效的 Cron 表达式
const validCronExpressions = [
  '* * * * *',      // 每分钟
  '0 * * * *',      // 每小时
  '0 0 * * *',      // 每天
  '0 0 * * 0',      // 每周日
  '0 0 1 * *',      // 每月1号
  '30 9 * * 1-5',   // 工作日 9:30
  '0 9,18 * * *',   // 每天 9:00 和 18:00
  '*/15 * * * *',   // 每15分钟
  '0 */2 * * *',    // 每2小时
];

// 无效的 Cron 表达式 (cron-parser 实际会拒绝的)
const invalidCronExpressions = [
  '',               // 空字符串
  '60 * * * *',     // 分钟超出范围
  '* 24 * * *',     // 小时超出范围
  '* * 32 * *',     // 日期超出范围
  '* * * 13 *',     // 月份超出范围
  'invalid',        // 完全无效
  'a b c d e',      // 非数字
  '* * * * * * *',  // 太多字段
  '-1 * * * *',     // 负数
];

// Arbitraries
const taskTypeArb: fc.Arbitrary<ScheduledTaskType> = fc.constantFrom('one-time', 'recurring');
const validCronArb = fc.constantFrom(...validCronExpressions);
const invalidCronArb = fc.constantFrom(...invalidCronExpressions);

// 未来时间生成器（至少 2 分钟后）
const futureTimeArb = fc.integer({ min: Date.now() + 2 * 60 * 1000, max: Date.now() + 365 * 24 * 60 * 60 * 1000 });

// 过去时间生成器
const pastTimeArb = fc.integer({ min: 0, max: Date.now() - 1000 });

describe('scheduledTaskValidator Property Tests', () => {
  /**
   * Property 3: 任务验证完整性
   * 验证: 需求 1.4
   * 缺少必填字段时应返回 valid: false
   */
  describe('Property 3: Task Validation Completeness', () => {
    it('should reject params with empty title', () => {
      fc.assert(
        fc.property(
          fc.record({
            type: taskTypeArb,
            title: fc.constantFrom('', '   ', '\t', '\n'),
            body: fc.string({ minLength: 1, maxLength: 100 }),
            targetKeyIds: fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 1, maxLength: 3 }),
            scheduledTime: futureTimeArb,
            cronExpression: validCronArb,
          }),
          (params) => {
            const result = validateCreateParams(params as CreateTaskParams);
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.field === 'title')).toBe(true);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should reject params with empty body', () => {
      fc.assert(
        fc.property(
          fc.record({
            type: taskTypeArb,
            title: fc.string({ minLength: 1, maxLength: 100 }),
            body: fc.constantFrom('', '   ', '\t', '\n'),
            targetKeyIds: fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 1, maxLength: 3 }),
            scheduledTime: futureTimeArb,
            cronExpression: validCronArb,
          }),
          (params) => {
            const result = validateCreateParams(params as CreateTaskParams);
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.field === 'body')).toBe(true);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should reject params with empty targetKeyIds', () => {
      fc.assert(
        fc.property(
          fc.record({
            type: taskTypeArb,
            title: fc.string({ minLength: 1, maxLength: 100 }),
            body: fc.string({ minLength: 1, maxLength: 100 }),
            targetKeyIds: fc.constant([]),
            scheduledTime: futureTimeArb,
            cronExpression: validCronArb,
          }),
          (params) => {
            const result = validateCreateParams(params as CreateTaskParams);
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.field === 'targetKeyIds')).toBe(true);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should reject one-time task without scheduledTime', () => {
      fc.assert(
        fc.property(
          fc.record({
            type: fc.constant('one-time' as const),
            title: fc.string({ minLength: 1, maxLength: 100 }),
            body: fc.string({ minLength: 1, maxLength: 100 }),
            targetKeyIds: fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 1, maxLength: 3 }),
          }),
          (params) => {
            const result = validateCreateParams(params as CreateTaskParams);
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.field === 'scheduledTime')).toBe(true);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should reject recurring task without cronExpression', () => {
      fc.assert(
        fc.property(
          fc.record({
            type: fc.constant('recurring' as const),
            title: fc.string({ minLength: 1, maxLength: 100 }),
            body: fc.string({ minLength: 1, maxLength: 100 }),
            targetKeyIds: fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 1, maxLength: 3 }),
          }),
          (params) => {
            const result = validateCreateParams(params as CreateTaskParams);
            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.field === 'cronExpression')).toBe(true);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should accept valid one-time task params', () => {
      fc.assert(
        fc.property(
          fc.record({
            type: fc.constant('one-time' as const),
            title: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
            body: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
            targetKeyIds: fc.array(fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0), { minLength: 1, maxLength: 3 }),
            scheduledTime: futureTimeArb,
          }),
          (params) => {
            const result = validateCreateParams(params as CreateTaskParams);
            expect(result.valid).toBe(true);
            expect(result.errors.length).toBe(0);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should accept valid recurring task params', () => {
      fc.assert(
        fc.property(
          fc.record({
            type: fc.constant('recurring' as const),
            title: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
            body: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
            targetKeyIds: fc.array(fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0), { minLength: 1, maxLength: 3 }),
            cronExpression: validCronArb,
          }),
          (params) => {
            const result = validateCreateParams(params as CreateTaskParams);
            expect(result.valid).toBe(true);
            expect(result.errors.length).toBe(0);
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  /**
   * Property 12: Cron 表达式验证
   * 验证: 需求 5.3
   * 无效的 Cron 表达式应返回 false
   */
  describe('Property 12: Cron Expression Validation', () => {
    it('should accept valid cron expressions', () => {
      fc.assert(
        fc.property(validCronArb, (expression) => {
          expect(validateCronExpression(expression)).toBe(true);
        }),
        { numRuns: 50 }
      );
    });

    it('should reject invalid cron expressions', () => {
      fc.assert(
        fc.property(invalidCronArb, (expression) => {
          expect(validateCronExpression(expression)).toBe(false);
        }),
        { numRuns: 50 }
      );
    });

    it('should reject empty or whitespace-only expressions', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('', ' ', '  ', '\t', '\n', '   '),
          (expression) => {
            expect(validateCronExpression(expression)).toBe(false);
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  /**
   * Property 8: 周期性任务下次执行时间计算
   * 验证: 需求 3.4
   * 计算的下次执行时间应大于当前时间
   */
  describe('Property 8: Next Execution Time Calculation', () => {
    it('should calculate next execution time greater than now for recurring tasks', () => {
      fc.assert(
        fc.property(validCronArb, (cronExpression) => {
          const task: ScheduledTask = {
            id: 'test_task',
            type: 'recurring',
            status: 'active',
            title: 'Test',
            body: 'Test body',
            targetKeyIds: ['key1'],
            cronExpression,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          };

          const nextTime = calculateNextExecutionTime(task);
          
          expect(nextTime).not.toBeNull();
          if (nextTime !== null) {
            expect(nextTime).toBeGreaterThan(Date.now());
          }
        }),
        { numRuns: 50 }
      );
    });

    it('should return scheduledTime for valid one-time tasks', () => {
      fc.assert(
        fc.property(futureTimeArb, (scheduledTime) => {
          const task: ScheduledTask = {
            id: 'test_task',
            type: 'one-time',
            status: 'active',
            title: 'Test',
            body: 'Test body',
            targetKeyIds: ['key1'],
            scheduledTime,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          };

          const nextTime = calculateNextExecutionTime(task);
          
          expect(nextTime).toBe(scheduledTime);
        }),
        { numRuns: 50 }
      );
    });

    it('should return null for past one-time tasks', () => {
      fc.assert(
        fc.property(pastTimeArb, (scheduledTime) => {
          const task: ScheduledTask = {
            id: 'test_task',
            type: 'one-time',
            status: 'active',
            title: 'Test',
            body: 'Test body',
            targetKeyIds: ['key1'],
            scheduledTime,
            createdAt: Date.now() - 1000000,
            updatedAt: Date.now() - 1000000,
          };

          const nextTime = calculateNextExecutionTime(task);
          
          expect(nextTime).toBeNull();
        }),
        { numRuns: 50 }
      );
    });
  });

  /**
   * Property 11: Cron 表达式执行时间预览
   * 验证: 需求 5.2
   * 预览的执行时间应按时间顺序递增
   */
  describe('Property 11: Cron Execution Time Preview', () => {
    it('should return execution times in ascending order', () => {
      fc.assert(
        fc.property(
          validCronArb,
          fc.integer({ min: 1, max: 10 }),
          (cronExpression, count) => {
            const preview = getExecutionPreview(cronExpression, count);
            
            expect(preview.length).toBe(count);
            
            // 验证时间递增
            for (let i = 1; i < preview.length; i++) {
              expect(preview[i].getTime()).toBeGreaterThan(preview[i - 1].getTime());
            }
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should return all times greater than now', () => {
      fc.assert(
        fc.property(validCronArb, (cronExpression) => {
          const now = Date.now();
          const preview = getExecutionPreview(cronExpression, 5);
          
          for (const time of preview) {
            expect(time.getTime()).toBeGreaterThan(now);
          }
        }),
        { numRuns: 50 }
      );
    });

    it('should return empty array for invalid cron expressions', () => {
      fc.assert(
        fc.property(invalidCronArb, (cronExpression) => {
          const preview = getExecutionPreview(cronExpression, 5);
          expect(preview.length).toBe(0);
        }),
        { numRuns: 30 }
      );
    });
  });

  /**
   * 一次性任务时间验证
   */
  describe('One-Time Schedule Validation', () => {
    it('should accept future times (at least 1 minute ahead)', () => {
      fc.assert(
        fc.property(futureTimeArb, (time) => {
          expect(validateOneTimeSchedule(time)).toBe(true);
        }),
        { numRuns: 50 }
      );
    });

    it('should reject past times', () => {
      fc.assert(
        fc.property(pastTimeArb, (time) => {
          expect(validateOneTimeSchedule(time)).toBe(false);
        }),
        { numRuns: 50 }
      );
    });

    it('should reject times too close to now (less than 1 minute)', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 59 * 1000 }),
          (offset) => {
            const time = Date.now() + offset;
            expect(validateOneTimeSchedule(time)).toBe(false);
          }
        ),
        { numRuns: 30 }
      );
    });
  });
});
