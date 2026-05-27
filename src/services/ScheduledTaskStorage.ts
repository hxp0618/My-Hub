/**
 * Bark 定时任务存储服务
 * 提供定时任务和执行历史的持久化存储功能
 */

import {
  SCHEDULED_TASK_EXECUTION_ERROR_KEYS,
  ScheduledTask,
  TaskExecutionRecord,
} from '../types/scheduledTask';
import { createLogger } from '../utils/logger';

const scheduledTaskStorageLogger = createLogger('[ScheduledTaskStorage]');

/** 存储键常量 */
const STORAGE_KEY = 'bark_scheduled_tasks';
const EXECUTION_HISTORY_KEY = 'bark_task_execution_history';

/** 最大执行历史记录数 */
const MAX_EXECUTION_HISTORY = 50;

const isRecord = (value: unknown): value is Record<string, unknown> => (
  !!value && typeof value === 'object' && !Array.isArray(value)
);

const isFiniteNumber = (value: unknown): value is number => (
  typeof value === 'number' && Number.isFinite(value)
);

const isStringArray = (value: unknown): value is string[] => (
  Array.isArray(value) && value.every(item => typeof item === 'string')
);

const isTaskOptions = (value: unknown): boolean => {
  if (value === undefined) return true;
  if (!isRecord(value)) return false;

  return (
    (value.sound === undefined || typeof value.sound === 'string') &&
    (value.icon === undefined || typeof value.icon === 'string') &&
    (value.group === undefined || typeof value.group === 'string')
  );
};

const isExecutionErrorMessageKey = (value: unknown): boolean => (
  typeof value === 'string' &&
  SCHEDULED_TASK_EXECUTION_ERROR_KEYS.includes(
    value as typeof SCHEDULED_TASK_EXECUTION_ERROR_KEYS[number]
  )
);

/**
 * 定时任务存储服务类
 * 提供任务和执行历史的 CRUD 操作
 */
export class ScheduledTaskStorage {
  /**
   * 加载所有定时任务
   * @returns 任务列表
   */
  loadTasks(): ScheduledTask[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const tasks: unknown = JSON.parse(stored);
        // 验证数据格式
        if (Array.isArray(tasks)) {
          return tasks.filter(task => this.isValidTask(task));
        }
      }
    } catch {
      return [];
    }
    return [];
  }

  /**
   * 保存所有定时任务
   * @param tasks 任务列表
   */
  saveTasks(tasks: ScheduledTask[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks.filter(task => this.isValidTask(task))));
    } catch (e) {
      scheduledTaskStorageLogger.error('Failed to save scheduled tasks:', e);
    }
  }

  /**
   * 添加新任务
   * @param task 任务配置
   */
  addTask(task: ScheduledTask): void {
    const tasks = this.loadTasks();
    tasks.unshift(task); // 添加到开头
    this.saveTasks(tasks);
  }

  /**
   * 更新任务
   * @param id 任务 ID
   * @param updates 要更新的字段
   * @returns 更新后的任务，如果不存在则返回 null
   */
  updateTask(id: string, updates: Partial<ScheduledTask>): ScheduledTask | null {
    const tasks = this.loadTasks();
    const index = tasks.findIndex(t => t.id === id);
    
    if (index === -1) {
      return null;
    }

    const updatedTask: ScheduledTask = {
      ...tasks[index],
      ...updates,
      id: tasks[index].id, // 确保 ID 不变
      createdAt: tasks[index].createdAt, // 确保创建时间不变
      updatedAt: Date.now(),
    };

    tasks[index] = updatedTask;
    this.saveTasks(tasks);
    
    return updatedTask;
  }

  /**
   * 删除任务
   * @param id 任务 ID
   * @returns 是否删除成功
   */
  deleteTask(id: string): boolean {
    const tasks = this.loadTasks();
    const index = tasks.findIndex(t => t.id === id);
    
    if (index === -1) {
      return false;
    }

    tasks.splice(index, 1);
    this.saveTasks(tasks);
    
    // 同时删除该任务的执行历史
    this.deleteExecutionHistoryByTaskId(id);
    
    return true;
  }

  /**
   * 获取单个任务
   * @param id 任务 ID
   * @returns 任务配置，如果不存在则返回 null
   */
  getTask(id: string): ScheduledTask | null {
    const tasks = this.loadTasks();
    return tasks.find(t => t.id === id) || null;
  }

  /**
   * 加载执行历史
   * @param taskId 可选的任务 ID，如果提供则只返回该任务的历史
   * @returns 执行历史记录列表
   */
  loadExecutionHistory(taskId?: string): TaskExecutionRecord[] {
    try {
      const stored = localStorage.getItem(EXECUTION_HISTORY_KEY);
      if (stored) {
        const history: unknown = JSON.parse(stored);
        if (Array.isArray(history)) {
          const validHistory = history.filter(record => this.isValidExecutionRecord(record));
          if (taskId) {
            return validHistory.filter(record => record.taskId === taskId);
          }
          return validHistory;
        }
      }
    } catch {
      return [];
    }
    return [];
  }

  /**
   * 添加执行记录
   * @param record 执行记录
   */
  addExecutionRecord(record: TaskExecutionRecord): void {
    const history = this.loadExecutionHistory();
    history.unshift(record); // 添加到开头
    
    // 自动清理超出限制的记录
    const limitedHistory = history.slice(0, MAX_EXECUTION_HISTORY);
    
    this.saveExecutionHistory(limitedHistory);
  }

  /**
   * 清理过期历史（保持每个任务最多 MAX_EXECUTION_HISTORY 条记录）
   */
  cleanupHistory(): void {
    const history = this.loadExecutionHistory();
    
    // 按任务分组
    const historyByTask = new Map<string, TaskExecutionRecord[]>();
    for (const record of history) {
      const taskHistory = historyByTask.get(record.taskId) || [];
      taskHistory.push(record);
      historyByTask.set(record.taskId, taskHistory);
    }

    // 每个任务只保留最新的记录
    const cleanedHistory: TaskExecutionRecord[] = [];
    for (const [, taskHistory] of historyByTask) {
      // 按执行时间排序（最新的在前）
      taskHistory.sort((a, b) => b.executedAt - a.executedAt);
      // 只保留前 MAX_EXECUTION_HISTORY 条
      cleanedHistory.push(...taskHistory.slice(0, MAX_EXECUTION_HISTORY));
    }

    // 全局再按时间排序
    cleanedHistory.sort((a, b) => b.executedAt - a.executedAt);
    
    // 全局限制
    const limitedHistory = cleanedHistory.slice(0, MAX_EXECUTION_HISTORY);
    
    this.saveExecutionHistory(limitedHistory);
  }

  /**
   * 删除指定任务的所有执行历史
   * @param taskId 任务 ID
   */
  private deleteExecutionHistoryByTaskId(taskId: string): void {
    const history = this.loadExecutionHistory();
    const filteredHistory = history.filter(record => record.taskId !== taskId);
    this.saveExecutionHistory(filteredHistory);
  }

  /**
   * 保存执行历史
   * @param history 执行历史列表
   */
  private saveExecutionHistory(history: TaskExecutionRecord[]): void {
    try {
      localStorage.setItem(
        EXECUTION_HISTORY_KEY,
        JSON.stringify(history.filter(record => this.isValidExecutionRecord(record)))
      );
    } catch (e) {
      scheduledTaskStorageLogger.error('Failed to save execution history:', e);
    }
  }

  /**
   * 验证任务数据是否有效
   * @param task 任务数据
   * @returns 是否有效
   */
  private isValidTask(task: unknown): task is ScheduledTask {
    if (!isRecord(task)) {
      return false;
    }

    const t = task;
    
    return (
      typeof t.id === 'string' &&
      (t.type === 'one-time' || t.type === 'recurring') &&
      (t.status === 'active' || t.status === 'paused' || t.status === 'completed' || t.status === 'failed') &&
      typeof t.title === 'string' &&
      typeof t.body === 'string' &&
      isStringArray(t.targetKeyIds) &&
      isFiniteNumber(t.createdAt) &&
      isFiniteNumber(t.updatedAt) &&
      isTaskOptions(t.options) &&
      (t.scheduledTime === undefined || isFiniteNumber(t.scheduledTime)) &&
      (t.nextExecutionTime === undefined || isFiniteNumber(t.nextExecutionTime)) &&
      (t.lastExecutedAt === undefined || isFiniteNumber(t.lastExecutedAt)) &&
      (t.cronExpression === undefined || typeof t.cronExpression === 'string')
    );
  }

  /**
   * 验证执行记录数据是否有效
   * @param record 执行记录数据
   * @returns 是否有效
   */
  private isValidExecutionRecord(record: unknown): record is TaskExecutionRecord {
    if (!isRecord(record)) {
      return false;
    }

    const r = record;
    
    return (
      typeof r.id === 'string' &&
      typeof r.taskId === 'string' &&
      isFiniteNumber(r.executedAt) &&
      (r.status === 'success' || r.status === 'failed') &&
      isStringArray(r.targetKeyIds) &&
      isFiniteNumber(r.successCount) &&
      isFiniteNumber(r.failedCount) &&
      (r.errorMessage === undefined || typeof r.errorMessage === 'string') &&
      (r.errorMessageKey === undefined || isExecutionErrorMessageKey(r.errorMessageKey))
    );
  }
}

/** 导出存储键常量供测试使用 */
export { STORAGE_KEY, EXECUTION_HISTORY_KEY, MAX_EXECUTION_HISTORY };
