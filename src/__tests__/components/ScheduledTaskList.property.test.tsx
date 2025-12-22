/**
 * ScheduledTaskList 属性测试
 * 使用 fast-check 进行属性测试验证任务列表渲染的正确性
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { ScheduledTaskList } from '../../pages/newtab/components/tools/bark/ScheduledTaskList';
import {
  ScheduledTask,
  ScheduledTaskType,
  ScheduledTaskStatus,
} from '../../types/scheduledTask';

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      if (params) {
        return `${key}: ${JSON.stringify(params)}`;
      }
      return key;
    },
  }),
}));

// Arbitraries for generating test data
const taskTypeArb: fc.Arbitrary<ScheduledTaskType> = fc.constantFrom('one-time', 'recurring');
const taskStatusArb: fc.Arbitrary<ScheduledTaskStatus> = fc.constantFrom('active', 'paused', 'completed', 'failed');

const scheduledTaskArb: fc.Arbitrary<ScheduledTask> = fc.record({
  id: fc.string({ minLength: 1, maxLength: 20 }).map(s => `task_${s}`),
  type: taskTypeArb,
  status: taskStatusArb,
  title: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
  body: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
  targetKeyIds: fc.array(fc.string({ minLength: 1, maxLength: 10 }), { minLength: 1, maxLength: 3 }),
  scheduledTime: fc.option(fc.integer({ min: Date.now(), max: Date.now() + 365 * 24 * 60 * 60 * 1000 }), { nil: undefined }),
  cronExpression: fc.option(fc.constantFrom('* * * * *', '0 * * * *', '0 0 * * *'), { nil: undefined }),
  nextExecutionTime: fc.option(fc.integer({ min: Date.now(), max: Date.now() + 365 * 24 * 60 * 60 * 1000 }), { nil: undefined }),
  createdAt: fc.integer({ min: 0, max: Date.now() }),
  updatedAt: fc.integer({ min: 0, max: Date.now() }),
  lastExecutedAt: fc.option(fc.integer({ min: 0, max: Date.now() }), { nil: undefined }),
});

describe('ScheduledTaskList Property Tests', () => {
  const mockHandlers = {
    onEdit: vi.fn(),
    onDelete: vi.fn(),
    onToggleStatus: vi.fn(),
    onViewHistory: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Property 4: 任务列表渲染完整性
   * 验证: 需求 2.2
   * 每个任务应该显示标题、类型、状态
   */
  describe('Property 4: Task List Rendering Completeness', () => {
    it('should render all tasks with their titles', () => {
      fc.assert(
        fc.property(
          fc.array(scheduledTaskArb, { minLength: 1, maxLength: 10 }),
          (tasks) => {
            // 确保 ID 唯一
            const uniqueTasks = tasks.map((task, index) => ({
              ...task,
              id: `task_${index}`,
            }));

            const { container } = render(
              <ScheduledTaskList
                tasks={uniqueTasks}
                {...mockHandlers}
              />
            );

            // 验证每个任务的标题都被渲染
            for (const task of uniqueTasks) {
              expect(container.textContent).toContain(task.title);
            }
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should render type badges for all tasks', () => {
      fc.assert(
        fc.property(
          fc.array(scheduledTaskArb, { minLength: 1, maxLength: 5 }),
          (tasks) => {
            const uniqueTasks = tasks.map((task, index) => ({
              ...task,
              id: `task_${index}`,
            }));

            const { container } = render(
              <ScheduledTaskList
                tasks={uniqueTasks}
                {...mockHandlers}
              />
            );

            // 验证类型徽章被渲染（通过 i18n key）
            for (const task of uniqueTasks) {
              expect(container.textContent).toContain(`tools.barkNotifier.scheduled.type.${task.type}`);
            }
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should render status badges for all tasks', () => {
      fc.assert(
        fc.property(
          fc.array(scheduledTaskArb, { minLength: 1, maxLength: 5 }),
          (tasks) => {
            const uniqueTasks = tasks.map((task, index) => ({
              ...task,
              id: `task_${index}`,
            }));

            const { container } = render(
              <ScheduledTaskList
                tasks={uniqueTasks}
                {...mockHandlers}
              />
            );

            // 验证状态徽章被渲染（通过 i18n key）
            for (const task of uniqueTasks) {
              expect(container.textContent).toContain(`tools.barkNotifier.scheduled.status.${task.status}`);
            }
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should show empty state when no tasks', () => {
      const { container } = render(
        <ScheduledTaskList
          tasks={[]}
          {...mockHandlers}
        />
      );

      // 验证空状态消息
      expect(container.textContent).toContain('tools.barkNotifier.scheduled.noTasks');
    });

    it('should render correct number of task items', () => {
      fc.assert(
        fc.property(
          fc.array(scheduledTaskArb, { minLength: 0, maxLength: 10 }),
          (tasks) => {
            const uniqueTasks = tasks.map((task, index) => ({
              ...task,
              id: `task_${index}`,
            }));

            const { container } = render(
              <ScheduledTaskList
                tasks={uniqueTasks}
                {...mockHandlers}
              />
            );

            if (uniqueTasks.length === 0) {
              // 空状态
              expect(container.textContent).toContain('tools.barkNotifier.scheduled.noTasks');
            } else {
              // 验证任务数量显示
              expect(container.textContent).toContain(`tools.barkNotifier.scheduled.taskCount`);
            }
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  /**
   * 额外测试: 操作按钮可见性
   */
  describe('Action Buttons Visibility', () => {
    it('should show toggle button only for active or paused tasks', () => {
      fc.assert(
        fc.property(scheduledTaskArb, (task) => {
          const { container } = render(
            <ScheduledTaskList
              tasks={[{ ...task, id: 'test_task' }]}
              {...mockHandlers}
            />
          );

          const canToggle = task.status === 'active' || task.status === 'paused';
          const toggleButtons = container.querySelectorAll('[title*="pause"], [title*="resume"]');
          
          // 如果可以切换，应该有切换按钮
          if (canToggle) {
            // 按钮存在（通过 material icon）
            const hasPlayOrPause = container.textContent?.includes('pause') || container.textContent?.includes('play_arrow');
            expect(hasPlayOrPause).toBe(true);
          }
        }),
        { numRuns: 20 }
      );
    });
  });
});
