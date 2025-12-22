/**
 * Bark 定时通知任务类型定义
 * 定义定时发送功能的核心类型和接口
 */

/** 任务类型 */
export type ScheduledTaskType = 'one-time' | 'recurring';

/** 任务状态 */
export type ScheduledTaskStatus = 'active' | 'paused' | 'completed' | 'failed';

/** 通知选项 */
export interface ScheduledTaskOptions {
  sound?: string;   // 响铃声音，空字符串表示静音
  icon?: string;    // 自定义图标 URL
  group?: string;   // 消息分组
}

/** 定时任务配置 */
export interface ScheduledTask {
  id: string;                      // 唯一标识符，格式: task_{timestamp}_{random}
  type: ScheduledTaskType;         // 任务类型
  status: ScheduledTaskStatus;     // 任务状态
  
  // 通知内容
  title: string;                   // 通知标题
  body: string;                    // 通知内容
  targetKeyIds: string[];          // 目标设备密钥 ID 列表
  
  // 通知选项
  options?: ScheduledTaskOptions;
  
  // 时间配置
  scheduledTime?: number;          // 一次性任务：执行时间戳（毫秒）
  cronExpression?: string;         // 周期性任务：Cron 表达式
  nextExecutionTime?: number;      // 下次执行时间戳（毫秒）
  
  // 元数据
  createdAt: number;               // 创建时间戳（毫秒）
  updatedAt: number;               // 更新时间戳（毫秒）
  lastExecutedAt?: number;         // 最后执行时间戳（毫秒）
}

/** 任务执行记录 */
export interface TaskExecutionRecord {
  id: string;                      // 唯一标识符，格式: exec_{timestamp}_{random}
  taskId: string;                  // 关联的任务 ID
  executedAt: number;              // 执行时间戳（毫秒）
  status: 'success' | 'failed';    // 执行状态
  errorMessage?: string;           // 错误信息（失败时）
  targetKeyIds: string[];          // 目标设备密钥 ID 列表
  successCount: number;            // 成功发送数量
  failedCount: number;             // 失败发送数量
}

/** 任务创建参数 */
export interface CreateTaskParams {
  type: ScheduledTaskType;
  title: string;
  body: string;
  targetKeyIds: string[];
  options?: ScheduledTaskOptions;
  scheduledTime?: number;          // 一次性任务必填
  cronExpression?: string;         // 周期性任务必填
}

/** 任务更新参数 */
export interface UpdateTaskParams {
  title?: string;
  body?: string;
  targetKeyIds?: string[];
  options?: ScheduledTaskOptions;
  scheduledTime?: number;
  cronExpression?: string;
  status?: ScheduledTaskStatus;
}

/** 验证错误项 */
export interface ValidationError {
  field: string;
  message: string;
}

/** 任务验证结果 */
export interface TaskValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

/** Chrome Alarm 名称前缀 */
export const ALARM_NAME_PREFIX = 'bark_scheduled_';

/** 生成 Alarm 名称 */
export function getAlarmName(taskId: string): string {
  return `${ALARM_NAME_PREFIX}${taskId}`;
}

/** 从 Alarm 名称解析任务 ID */
export function parseAlarmName(alarmName: string): string | null {
  if (alarmName.startsWith(ALARM_NAME_PREFIX)) {
    return alarmName.slice(ALARM_NAME_PREFIX.length);
  }
  return null;
}

/** 生成任务 ID */
export function generateTaskId(): string {
  return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/** 生成执行记录 ID */
export function generateExecutionId(): string {
  return `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
