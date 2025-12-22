/**
 * Bark 定时任务验证器
 * 提供任务创建参数验证和时间计算功能
 */

import {
  CreateTaskParams,
  ScheduledTask,
  TaskValidationResult,
  ValidationError,
} from '../types/scheduledTask';
import { validateCronExpression as validateCron, getNextExecutions } from './cronUtils';

/** 最小提前时间（毫秒）- 任务至少需要提前 1 分钟创建 */
const MIN_ADVANCE_TIME = 60 * 1000;

/**
 * 验证任务创建参数
 * @param params 创建参数
 * @returns 验证结果
 */
export function validateCreateParams(params: CreateTaskParams): TaskValidationResult {
  const errors: ValidationError[] = [];

  // 验证标题
  if (!params.title || params.title.trim().length === 0) {
    errors.push({
      field: 'title',
      message: 'tools.barkNotifier.scheduled.validation.titleRequired',
    });
  }

  // 验证内容
  if (!params.body || params.body.trim().length === 0) {
    errors.push({
      field: 'body',
      message: 'tools.barkNotifier.scheduled.validation.bodyRequired',
    });
  }

  // 验证目标设备
  if (!params.targetKeyIds || params.targetKeyIds.length === 0) {
    errors.push({
      field: 'targetKeyIds',
      message: 'tools.barkNotifier.scheduled.validation.targetRequired',
    });
  }

  // 根据任务类型验证时间配置
  if (params.type === 'one-time') {
    if (!params.scheduledTime) {
      errors.push({
        field: 'scheduledTime',
        message: 'tools.barkNotifier.scheduled.validation.scheduledTimeRequired',
      });
    } else if (!validateOneTimeSchedule(params.scheduledTime)) {
      errors.push({
        field: 'scheduledTime',
        message: 'tools.barkNotifier.scheduled.validation.scheduledTimeInvalid',
      });
    }
  } else if (params.type === 'recurring') {
    if (!params.cronExpression) {
      errors.push({
        field: 'cronExpression',
        message: 'tools.barkNotifier.scheduled.validation.cronRequired',
      });
    } else if (!validateCronExpression(params.cronExpression)) {
      errors.push({
        field: 'cronExpression',
        message: 'tools.barkNotifier.scheduled.validation.cronInvalid',
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * 验证一次性任务时间
 * 时间必须在当前时间之后至少 MIN_ADVANCE_TIME
 * @param scheduledTime 计划执行时间戳（毫秒）
 * @returns 是否有效
 */
export function validateOneTimeSchedule(scheduledTime: number): boolean {
  const now = Date.now();
  return scheduledTime > now + MIN_ADVANCE_TIME;
}

/**
 * 验证 Cron 表达式
 * @param expression Cron 表达式
 * @returns 是否有效
 */
export function validateCronExpression(expression: string): boolean {
  if (!expression || expression.trim().length === 0) {
    return false;
  }
  
  const result = validateCron(expression);
  return result.isValid;
}

/**
 * 计算下次执行时间
 * @param task 任务配置
 * @returns 下次执行时间戳（毫秒），如果无法计算则返回 null
 */
export function calculateNextExecutionTime(task: ScheduledTask): number | null {
  if (task.type === 'one-time') {
    // 一次性任务直接返回计划时间
    if (task.scheduledTime && task.scheduledTime > Date.now()) {
      return task.scheduledTime;
    }
    return null;
  }

  if (task.type === 'recurring' && task.cronExpression) {
    // 周期性任务使用 Cron 表达式计算
    const nextExecutions = getNextExecutions(task.cronExpression, 1);
    if (nextExecutions.length > 0) {
      return nextExecutions[0].getTime();
    }
  }

  return null;
}

/**
 * 验证任务更新参数
 * @param task 现有任务
 * @param updates 更新参数
 * @returns 验证结果
 */
export function validateUpdateParams(
  task: ScheduledTask,
  updates: Partial<CreateTaskParams>
): TaskValidationResult {
  const errors: ValidationError[] = [];

  // 如果更新标题，验证不为空
  if (updates.title !== undefined && updates.title.trim().length === 0) {
    errors.push({
      field: 'title',
      message: 'tools.barkNotifier.scheduled.validation.titleRequired',
    });
  }

  // 如果更新内容，验证不为空
  if (updates.body !== undefined && updates.body.trim().length === 0) {
    errors.push({
      field: 'body',
      message: 'tools.barkNotifier.scheduled.validation.bodyRequired',
    });
  }

  // 如果更新目标设备，验证不为空
  if (updates.targetKeyIds !== undefined && updates.targetKeyIds.length === 0) {
    errors.push({
      field: 'targetKeyIds',
      message: 'tools.barkNotifier.scheduled.validation.targetRequired',
    });
  }

  // 如果更新一次性任务时间
  if (task.type === 'one-time' && updates.scheduledTime !== undefined) {
    if (!validateOneTimeSchedule(updates.scheduledTime)) {
      errors.push({
        field: 'scheduledTime',
        message: 'tools.barkNotifier.scheduled.validation.scheduledTimeInvalid',
      });
    }
  }

  // 如果更新 Cron 表达式
  if (task.type === 'recurring' && updates.cronExpression !== undefined) {
    if (!validateCronExpression(updates.cronExpression)) {
      errors.push({
        field: 'cronExpression',
        message: 'tools.barkNotifier.scheduled.validation.cronInvalid',
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * 获取未来执行时间预览
 * @param cronExpression Cron 表达式
 * @param count 预览数量，默认 5
 * @returns 执行时间数组
 */
export function getExecutionPreview(cronExpression: string, count: number = 5): Date[] {
  if (!validateCronExpression(cronExpression)) {
    return [];
  }
  return getNextExecutions(cronExpression, count);
}
