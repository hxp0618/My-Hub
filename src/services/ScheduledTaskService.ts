/**
 * Bark 定时任务调度服务
 * 提供任务的创建、更新、删除、执行和调度功能
 */

import {
  ScheduledTask,
  TaskExecutionRecord,
  CreateTaskParams,
  UpdateTaskParams,
  ScheduledTaskStatus,
  generateTaskId,
  generateExecutionId,
  getAlarmName,
} from '../types/scheduledTask';
import { ScheduledTaskStorage } from './ScheduledTaskStorage';
import {
  validateCreateParams,
  validateUpdateParams,
  calculateNextExecutionTime,
} from '../utils/scheduledTaskValidator';
import { BarkKeyManager } from './BarkKeyManager';

/** 存储键常量 - 与 background script 保持一致 */
const STORAGE_KEY = 'bark_scheduled_tasks';
const BARK_KEYS_STORAGE_KEY = 'bark_keys';

/**
 * 定时任务调度服务类
 */
export class ScheduledTaskService {
  private storage: ScheduledTaskStorage;
  private keyManager: BarkKeyManager;

  constructor() {
    this.storage = new ScheduledTaskStorage();
    this.keyManager = new BarkKeyManager();
    
    // 初始化时同步数据到 chrome.storage.local
    this.syncDataToBackground();
  }

  /**
   * 同步任务和密钥数据到 chrome.storage.local（供 background script 使用）
   */
  private syncDataToBackground(): void {
    if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) {
      return;
    }

    // 同步任务数据
    const tasks = this.storage.loadTasks();
    chrome.runtime.sendMessage({
      type: 'SYNC_TASKS_TO_STORAGE',
      tasks,
    }).catch(() => {
      // 忽略错误，background script 可能还没准备好
    });

    // 同步密钥数据
    const keys = this.keyManager.getAllKeys();
    chrome.runtime.sendMessage({
      type: 'SYNC_KEYS_TO_STORAGE',
      keys,
    }).catch(() => {
      // 忽略错误
    });
  }

  /**
   * 同步任务数据到 chrome.storage.local
   */
  private syncTasksToBackground(): void {
    if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) {
      return;
    }

    const tasks = this.storage.loadTasks();
    chrome.runtime.sendMessage({
      type: 'SYNC_TASKS_TO_STORAGE',
      tasks,
    }).catch(() => {
      // 忽略错误
    });
  }

  /**
   * 创建定时任务
   * @param params 创建参数
   * @returns 创建的任务
   * @throws 验证失败时抛出错误
   */
  createTask(params: CreateTaskParams): ScheduledTask {
    // 验证参数
    const validation = validateCreateParams(params);
    if (!validation.valid) {
      throw new Error(validation.errors.map(e => e.message).join(', '));
    }

    const now = Date.now();
    const task: ScheduledTask = {
      id: generateTaskId(),
      type: params.type,
      status: 'active',
      title: params.title,
      body: params.body,
      targetKeyIds: params.targetKeyIds,
      options: params.options,
      scheduledTime: params.scheduledTime,
      cronExpression: params.cronExpression,
      createdAt: now,
      updatedAt: now,
    };

    // 计算下次执行时间
    task.nextExecutionTime = calculateNextExecutionTime(task) ?? undefined;

    // 保存任务
    this.storage.addTask(task);

    // 同步到 background
    this.syncTasksToBackground();

    // 注册 Alarm
    if (task.status === 'active' && task.nextExecutionTime) {
      this.registerAlarm(task);
    }

    return task;
  }

  /**
   * 更新定时任务
   * @param id 任务 ID
   * @param params 更新参数
   * @returns 更新后的任务
   * @throws 任务不存在或验证失败时抛出错误
   */
  updateTask(id: string, params: UpdateTaskParams): ScheduledTask {
    const existingTask = this.storage.getTask(id);
    if (!existingTask) {
      throw new Error('Task not found');
    }

    // 验证更新参数
    const validation = validateUpdateParams(existingTask, params);
    if (!validation.valid) {
      throw new Error(validation.errors.map(e => e.message).join(', '));
    }

    // 构建更新对象
    const updates: Partial<ScheduledTask> = {
      ...params,
      updatedAt: Date.now(),
    };

    // 如果更新了时间配置，重新计算下次执行时间
    if (params.scheduledTime !== undefined || params.cronExpression !== undefined) {
      const tempTask: ScheduledTask = {
        ...existingTask,
        ...updates,
      };
      updates.nextExecutionTime = calculateNextExecutionTime(tempTask) ?? undefined;
    }

    // 更新任务
    const updatedTask = this.storage.updateTask(id, updates);
    if (!updatedTask) {
      throw new Error('Failed to update task');
    }

    // 同步到 background
    this.syncTasksToBackground();

    // 重新注册 Alarm
    this.cancelAlarm(id);
    if (updatedTask.status === 'active' && updatedTask.nextExecutionTime) {
      this.registerAlarm(updatedTask);
    }

    return updatedTask;
  }

  /**
   * 删除定时任务
   * @param id 任务 ID
   */
  deleteTask(id: string): void {
    // 取消 Alarm
    this.cancelAlarm(id);

    // 删除任务（存储服务会同时删除执行历史）
    const deleted = this.storage.deleteTask(id);
    if (!deleted) {
      throw new Error('Task not found');
    }

    // 同步到 background
    this.syncTasksToBackground();
  }

  /**
   * 切换任务状态（active <-> paused）
   * @param id 任务 ID
   * @returns 更新后的任务
   */
  toggleTaskStatus(id: string): ScheduledTask {
    const task = this.storage.getTask(id);
    if (!task) {
      throw new Error('Task not found');
    }

    // 只能切换 active 和 paused 状态
    if (task.status !== 'active' && task.status !== 'paused') {
      throw new Error('Cannot toggle status of completed or failed task');
    }

    const newStatus: ScheduledTaskStatus = task.status === 'active' ? 'paused' : 'active';

    // 如果是周期性任务且从暂停恢复，重新计算下次执行时间
    let nextExecutionTime = task.nextExecutionTime;
    if (newStatus === 'active' && task.type === 'recurring') {
      nextExecutionTime = calculateNextExecutionTime(task) ?? undefined;
    }

    const updatedTask = this.storage.updateTask(id, {
      status: newStatus,
      nextExecutionTime,
    });

    if (!updatedTask) {
      throw new Error('Failed to update task status');
    }

    // 同步到 background
    this.syncTasksToBackground();

    // 更新 Alarm
    if (newStatus === 'active' && updatedTask.nextExecutionTime) {
      this.registerAlarm(updatedTask);
    } else {
      this.cancelAlarm(id);
    }

    return updatedTask;
  }

  /**
   * 获取所有任务
   * @returns 任务列表
   */
  getAllTasks(): ScheduledTask[] {
    return this.storage.loadTasks();
  }

  /**
   * 获取待执行任务（active 状态且有下次执行时间）
   * @returns 待执行任务列表
   */
  getPendingTasks(): ScheduledTask[] {
    const tasks = this.storage.loadTasks();
    return tasks.filter(
      task => task.status === 'active' && task.nextExecutionTime !== undefined
    );
  }

  /**
   * 执行任务
   * @param taskId 任务 ID
   * @returns 执行记录
   */
  async executeTask(taskId: string): Promise<TaskExecutionRecord> {
    const task = this.storage.getTask(taskId);
    if (!task) {
      throw new Error('Task not found');
    }

    const executionRecord: TaskExecutionRecord = {
      id: generateExecutionId(),
      taskId,
      executedAt: Date.now(),
      status: 'success',
      targetKeyIds: task.targetKeyIds,
      successCount: 0,
      failedCount: 0,
    };

    // 获取目标密钥
    const allKeys = this.keyManager.getAllKeys();
    const targetKeys = allKeys.filter(key => task.targetKeyIds.includes(key.id));

    if (targetKeys.length === 0) {
      executionRecord.status = 'failed';
      executionRecord.errorMessage = 'No valid target keys found';
      this.storage.addExecutionRecord(executionRecord);
      this.markTaskFailed(taskId, executionRecord.errorMessage);
      return executionRecord;
    }

    // 发送通知到所有目标设备
    const results = await Promise.allSettled(
      targetKeys.map(key => this.sendNotification(key, task))
    );

    // 统计结果
    for (const result of results) {
      if (result.status === 'fulfilled' && result.value.success) {
        executionRecord.successCount++;
      } else {
        executionRecord.failedCount++;
        if (result.status === 'rejected') {
          executionRecord.errorMessage = result.reason?.message || 'Unknown error';
        } else if (!result.value.success) {
          executionRecord.errorMessage = result.value.error || 'Send failed';
        }
      }
    }

    // 设置执行状态
    if (executionRecord.successCount === 0) {
      executionRecord.status = 'failed';
    }

    // 保存执行记录
    this.storage.addExecutionRecord(executionRecord);

    // 更新任务状态
    await this.updateTaskAfterExecution(task, executionRecord);

    return executionRecord;
  }

  /**
   * 注册 Chrome Alarm
   * @param task 任务配置
   */
  registerAlarm(task: ScheduledTask): void {
    if (!task.nextExecutionTime) {
      console.warn('registerAlarm: No nextExecutionTime for task', task.id);
      return;
    }

    // 检查 chrome.alarms API 是否可用
    if (typeof chrome === 'undefined' || !chrome.alarms) {
      // 在非 background 环境中，通过消息通知 background script 注册 alarm
      if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
        console.log(`Sending message to background to register alarm for task ${task.id}`);
        chrome.runtime.sendMessage({
          type: 'REGISTER_TASK_ALARM',
          taskId: task.id,
          nextExecutionTime: task.nextExecutionTime,
        }).catch((error) => {
          // 忽略连接错误，background script 会在启动时恢复所有任务
          console.warn('Failed to send message to background (will be restored on extension restart):', error.message);
        });
      }
      return;
    }

    const alarmName = getAlarmName(task.id);
    const when = task.nextExecutionTime;

    // Chrome Alarm 最小延迟为 1 分钟
    const minDelay = 60 * 1000;
    const now = Date.now();
    const delay = Math.max(when - now, minDelay);

    console.log(`Registering alarm: ${alarmName}, scheduled for ${new Date(now + delay).toISOString()}`);
    
    chrome.alarms.create(alarmName, {
      when: now + delay,
    });
  }

  /**
   * 取消 Chrome Alarm
   * @param taskId 任务 ID
   */
  cancelAlarm(taskId: string): void {
    // 检查 chrome.alarms API 是否可用
    if (typeof chrome === 'undefined' || !chrome.alarms) {
      // 在非 background 环境中，通过消息通知 background script 取消 alarm
      if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
        console.log(`Sending message to background to cancel alarm for task ${taskId}`);
        chrome.runtime.sendMessage({
          type: 'CANCEL_TASK_ALARM',
          taskId: taskId,
        }).catch((error) => {
          console.warn('Failed to send message to background:', error.message);
        });
      }
      return;
    }

    const alarmName = getAlarmName(taskId);
    console.log(`Canceling alarm: ${alarmName}`);
    chrome.alarms.clear(alarmName);
  }

  /**
   * 恢复所有任务调度
   * 在扩展启动或安装时调用
   */
  restoreAllAlarms(): void {
    const pendingTasks = this.getPendingTasks();
    
    for (const task of pendingTasks) {
      // 检查是否需要更新下次执行时间
      if (task.nextExecutionTime && task.nextExecutionTime < Date.now()) {
        // 时间已过，重新计算
        const newNextTime = calculateNextExecutionTime(task);
        if (newNextTime) {
          this.storage.updateTask(task.id, { nextExecutionTime: newNextTime });
          task.nextExecutionTime = newNextTime;
        } else if (task.type === 'one-time') {
          // 一次性任务已过期，标记为完成
          this.storage.updateTask(task.id, { status: 'completed' });
          continue;
        }
      }

      // 注册 Alarm
      if (task.nextExecutionTime) {
        this.registerAlarm(task);
      }
    }
  }

  /**
   * 获取任务执行历史（同步方法，从 localStorage 读取）
   * @param taskId 可选的任务 ID
   * @returns 执行历史列表
   * @deprecated 使用 getExecutionHistoryAsync 代替
   */
  getExecutionHistory(taskId?: string): TaskExecutionRecord[] {
    return this.storage.loadExecutionHistory(taskId);
  }

  /**
   * 获取任务执行历史（异步方法，从 chrome.storage.local 读取）
   * @param taskId 可选的任务 ID
   * @returns 执行历史列表
   */
  async getExecutionHistoryAsync(taskId?: string): Promise<TaskExecutionRecord[]> {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage?.local) {
        const result = await chrome.storage.local.get('bark_task_execution_history');
        const history = result['bark_task_execution_history'];
        if (Array.isArray(history)) {
          if (taskId) {
            return history.filter((record: TaskExecutionRecord) => record.taskId === taskId);
          }
          return history;
        }
      }
    } catch (e) {
      console.error('Failed to load execution history from chrome.storage.local:', e);
    }
    // 回退到 localStorage
    return this.storage.loadExecutionHistory(taskId);
  }

  /**
   * 发送通知到单个设备
   */
  private async sendNotification(
    key: { server: string; deviceKey: string },
    task: ScheduledTask
  ): Promise<{ success: boolean; error?: string }> {
    try {
      let url = `${key.server}/${key.deviceKey}/${encodeURIComponent(task.title)}/${encodeURIComponent(task.body)}`;

      const params = new URLSearchParams();
      if (task.options?.sound === '') {
        params.append('sound', '');
      }
      if (task.options?.icon) {
        params.append('icon', task.options.icon);
      }
      if (task.options?.group) {
        params.append('group', task.options.group);
      }

      const queryString = params.toString();
      if (queryString) {
        url += `?${queryString}`;
      }

      const response = await fetch(url);
      const data = await response.json();

      return {
        success: data.code === 200,
        error: data.code !== 200 ? data.message : undefined,
      };
    } catch (e) {
      return {
        success: false,
        error: (e as Error).message,
      };
    }
  }

  /**
   * 执行后更新任务状态
   */
  private async updateTaskAfterExecution(
    task: ScheduledTask,
    record: TaskExecutionRecord
  ): Promise<void> {
    const updates: Partial<ScheduledTask> = {
      lastExecutedAt: record.executedAt,
    };

    if (task.type === 'one-time') {
      // 一次性任务执行后标记为完成
      updates.status = record.status === 'success' ? 'completed' : 'failed';
      updates.nextExecutionTime = undefined;
    } else if (task.type === 'recurring') {
      // 周期性任务计算下次执行时间
      const nextTime = calculateNextExecutionTime(task);
      updates.nextExecutionTime = nextTime ?? undefined;

      // 如果有下次执行时间，注册新的 Alarm
      if (nextTime) {
        const updatedTask = { ...task, ...updates, nextExecutionTime: nextTime };
        this.registerAlarm(updatedTask);
      }
    }

    this.storage.updateTask(task.id, updates);
  }

  /**
   * 标记任务为失败状态
   */
  private markTaskFailed(taskId: string, errorMessage: string): void {
    this.storage.updateTask(taskId, {
      status: 'failed',
    });
  }
}

/** 导出单例实例 */
export const scheduledTaskService = new ScheduledTaskService();
