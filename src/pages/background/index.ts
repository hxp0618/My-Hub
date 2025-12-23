console.log('background script loaded - v3');

import { deleteBookmarkTag, deleteMultipleBookmarkTags, getBookmarkTag, addBookmarkTag } from '../../db/indexedDB';
import { parseAlarmName, ALARM_NAME_PREFIX, getAlarmName } from '../../types/scheduledTask';

// 内存映射表：id -> url
const bookmarkIdToUrlMap = new Map<string, string>();

// 递归构建 id -> url 映射表
const buildIdUrlMapping = (node: chrome.bookmarks.BookmarkTreeNode): void => {
  // 如果是书签（有URL），添加到映射表
  if (node.url) {
    bookmarkIdToUrlMap.set(node.id, node.url);
  }

  // 递归处理子节点
  if (node.children) {
    for (const child of node.children) {
      buildIdUrlMapping(child);
    }
  }
};

// 初始化映射表
const initializeMapping = async (): Promise<void> => {
  try {
    const bookmarkTree = await chrome.bookmarks.getTree();
    console.log('Building id->url mapping from bookmark tree');

    // 遍历整个书签树构建映射
    bookmarkTree.forEach(rootNode => {
      buildIdUrlMapping(rootNode);
    });

    console.log(`Initialized mapping with ${bookmarkIdToUrlMap.size} bookmarks`);
  } catch (error) {
    console.error('Error initializing id->url mapping:', error);
  }
};

// 启动时初始化映射表
initializeMapping();

// 递归获取文件夹中所有书签的URL
const getAllBookmarkUrls = (node: chrome.bookmarks.BookmarkTreeNode): string[] => {
  const urls: string[] = [];

  // 如果是书签（有URL），添加到列表
  if (node.url) {
    urls.push(node.url);
  }

  // 递归处理子节点
  if (node.children) {
    for (const child of node.children) {
      urls.push(...getAllBookmarkUrls(child));
    }
  }

  return urls;
};

// 监听书签创建事件
chrome.bookmarks.onCreated.addListener(async (id, bookmark) => {
  if (bookmark.url) {
    console.log('bookmark created, updating mapping', id, bookmark.url);
    // 更新内存映射表
    bookmarkIdToUrlMap.set(id, bookmark.url);
  }
});

// 监听书签删除事件
chrome.bookmarks.onRemoved.addListener((id, removeInfo) => {
  console.log('bookmark removed, deleting from indexedDB', id);

  // 检查是否为文件夹（url 为空表示文件夹）
  if (!removeInfo.node.url) {
    console.log('folder removed, processing all contained bookmarks');
    // 获取文件夹中所有书签的URL
    const bookmarkUrls = getAllBookmarkUrls(removeInfo.node);

    if (bookmarkUrls.length > 0) {
      // 批量删除所有书签的标签数据
      deleteMultipleBookmarkTags(bookmarkUrls).catch(error => {
        console.error('Error deleting multiple bookmark tags:', error);
      });
    }

    // 从映射表中移除文件夹中的所有书签
    const removeFromMapping = (node: chrome.bookmarks.BookmarkTreeNode): void => {
      if (node.url) {
        bookmarkIdToUrlMap.delete(node.id);
      }
      if (node.children) {
        node.children.forEach(removeFromMapping);
      }
    };
    removeFromMapping(removeInfo.node);
  } else {
    // 单个书签删除 - 使用URL作为主键
    deleteBookmarkTag(removeInfo.node.url).catch(error => {
      console.error('Error deleting bookmark tag:', error);
    });

    // 从映射表中移除
    bookmarkIdToUrlMap.delete(id);
  }
});

// 监听书签变更事件（处理URL变更）
chrome.bookmarks.onChanged.addListener(async (id, changeInfo) => {
  console.log('bookmark changed', id, changeInfo);

  // 检查是否为URL变更
  if (changeInfo.url) {
    console.log('URL changed, migrating tag data');

    try {
      // 从映射表中获取旧的URL
      const oldUrl = bookmarkIdToUrlMap.get(id);

      if (oldUrl && oldUrl !== changeInfo.url) {
        // 读取旧URL对应的标签数据
        const oldTagData = await getBookmarkTag(oldUrl);

        if (oldTagData) {
          // 删除旧记录
          await deleteBookmarkTag(oldUrl);

          // 使用新URL创建新记录
          await addBookmarkTag({
            url: changeInfo.url,
            tags: oldTagData.tags
          });

          console.log(`Migrated tag data from ${oldUrl} to ${changeInfo.url}`);
        }

        // 更新映射表
        bookmarkIdToUrlMap.set(id, changeInfo.url);
      }
    } catch (error) {
      console.error('Error migrating tag data on URL change:', error);
    }
  }
});


// ============================================
// Bark 定时任务调度
// ============================================

// 存储键常量
const STORAGE_KEY = 'bark_scheduled_tasks';
const BARK_KEYS_STORAGE_KEY = 'bark_keys';
const EXECUTION_HISTORY_KEY = 'bark_task_execution_history';
const MAX_EXECUTION_HISTORY = 50;

// 任务类型定义
interface ScheduledTask {
  id: string;
  type: 'one-time' | 'recurring';
  status: 'active' | 'paused' | 'completed' | 'failed';
  title: string;
  body: string;
  targetKeyIds: string[];
  options?: {
    sound?: string;
    icon?: string;
    group?: string;
  };
  scheduledTime?: number;
  cronExpression?: string;
  nextExecutionTime?: number;
  createdAt: number;
  updatedAt: number;
}

// 执行记录类型
interface TaskExecutionRecord {
  id: string;
  taskId: string;
  executedAt: number;
  status: 'success' | 'failed';
  errorMessage?: string;
  targetKeyIds: string[];
  successCount: number;
  failedCount: number;
}

interface BarkKeyConfig {
  id: string;
  deviceKey: string;
  server: string;
  label: string;
}

/**
 * 从 localStorage 加载任务（在 Service Worker 中使用 chrome.storage.local 模拟）
 */
async function loadTasksFromStorage(): Promise<ScheduledTask[]> {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEY);
    const tasks = result[STORAGE_KEY];
    if (Array.isArray(tasks)) {
      return tasks;
    }
  } catch (e) {
    console.error('Failed to load scheduled tasks:', e);
  }
  return [];
}

/**
 * 保存任务到存储
 */
async function saveTasksToStorage(tasks: ScheduledTask[]): Promise<void> {
  try {
    await chrome.storage.local.set({ [STORAGE_KEY]: tasks });
  } catch (e) {
    console.error('Failed to save scheduled tasks:', e);
  }
}

/**
 * 从存储加载 Bark 密钥
 */
async function loadKeysFromStorage(): Promise<BarkKeyConfig[]> {
  try {
    const result = await chrome.storage.local.get(BARK_KEYS_STORAGE_KEY);
    const keys = result[BARK_KEYS_STORAGE_KEY];
    if (Array.isArray(keys)) {
      return keys;
    }
  } catch (e) {
    console.error('Failed to load Bark keys:', e);
  }
  return [];
}

/**
 * 生成执行记录 ID
 */
function generateExecutionId(): string {
  return `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 保存执行历史记录
 */
async function saveExecutionRecord(record: TaskExecutionRecord): Promise<void> {
  try {
    // 同时保存到 chrome.storage.local 和 localStorage
    // chrome.storage.local 用于 background script
    const result = await chrome.storage.local.get(EXECUTION_HISTORY_KEY);
    let history: TaskExecutionRecord[] = result[EXECUTION_HISTORY_KEY] || [];
    
    // 添加新记录到开头
    history.unshift(record);
    
    // 限制记录数量
    if (history.length > MAX_EXECUTION_HISTORY) {
      history = history.slice(0, MAX_EXECUTION_HISTORY);
    }
    
    await chrome.storage.local.set({ [EXECUTION_HISTORY_KEY]: history });
    console.log('Execution record saved:', record.id);
  } catch (e) {
    console.error('Failed to save execution record:', e);
  }
}

/**
 * 发送 Bark 通知
 */
async function sendBarkNotification(
  key: BarkKeyConfig,
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

    console.log(`Sending Bark notification to ${key.label}: ${url}`);
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
 * 简单的 Cron 表达式解析器（用于 Service Worker 环境）
 * 支持标准 5 字段格式：分 时 日 月 周
 */
function parseSimpleCron(expression: string): { minute: number[]; hour: number[]; day: number[]; month: number[]; weekday: number[] } | null {
  const parts = expression.trim().split(/\s+/);
  if (parts.length !== 5) return null;

  const parseField = (field: string, min: number, max: number): number[] => {
    const values: number[] = [];
    
    // 处理 *
    if (field === '*') {
      for (let i = min; i <= max; i++) values.push(i);
      return values;
    }
    
    // 处理逗号分隔的值
    const segments = field.split(',');
    for (const segment of segments) {
      // 处理步进 */n 或 start/n
      if (segment.includes('/')) {
        const [range, stepStr] = segment.split('/');
        const step = parseInt(stepStr, 10);
        let start = min;
        let end = max;
        
        if (range !== '*') {
          if (range.includes('-')) {
            const [s, e] = range.split('-').map(n => parseInt(n, 10));
            start = s;
            end = e;
          } else {
            start = parseInt(range, 10);
          }
        }
        
        for (let i = start; i <= end; i += step) {
          if (!values.includes(i)) values.push(i);
        }
      }
      // 处理范围 start-end
      else if (segment.includes('-')) {
        const [start, end] = segment.split('-').map(n => parseInt(n, 10));
        for (let i = start; i <= end; i++) {
          if (!values.includes(i)) values.push(i);
        }
      }
      // 处理单个值
      else {
        const val = parseInt(segment, 10);
        if (!isNaN(val) && !values.includes(val)) values.push(val);
      }
    }
    
    return values.sort((a, b) => a - b);
  };

  try {
    return {
      minute: parseField(parts[0], 0, 59),
      hour: parseField(parts[1], 0, 23),
      day: parseField(parts[2], 1, 31),
      month: parseField(parts[3], 1, 12),
      weekday: parseField(parts[4], 0, 6),
    };
  } catch {
    return null;
  }
}

/**
 * 计算下次执行时间
 */
function calculateNextExecutionTime(cronExpression: string): number | null {
  const cron = parseSimpleCron(cronExpression);
  if (!cron) {
    console.error('Failed to parse cron expression:', cronExpression);
    return null;
  }

  const now = new Date();
  const maxIterations = 366 * 24 * 60; // 最多检查一年
  
  // 从下一分钟开始
  const next = new Date(now);
  next.setSeconds(0);
  next.setMilliseconds(0);
  next.setMinutes(next.getMinutes() + 1);

  for (let i = 0; i < maxIterations; i++) {
    const minute = next.getMinutes();
    const hour = next.getHours();
    const day = next.getDate();
    const month = next.getMonth() + 1;
    const weekday = next.getDay();

    if (
      cron.minute.includes(minute) &&
      cron.hour.includes(hour) &&
      cron.day.includes(day) &&
      cron.month.includes(month) &&
      cron.weekday.includes(weekday)
    ) {
      return next.getTime();
    }

    // 增加一分钟
    next.setMinutes(next.getMinutes() + 1);
  }

  return null;
}

/**
 * 执行定时任务
 */
async function executeScheduledTask(taskId: string): Promise<void> {
  console.log(`Executing scheduled task: ${taskId}`);

  try {
    const tasks = await loadTasksFromStorage();
    const task = tasks.find(t => t.id === taskId);

    if (!task) {
      console.error(`Task not found: ${taskId}`);
      return;
    }

    const keys = await loadKeysFromStorage();
    const targetKeys = keys.filter(key => task.targetKeyIds.includes(key.id));

    if (targetKeys.length === 0) {
      console.error(`No valid target keys found for task: ${taskId}`);
      // 标记任务失败
      const updatedTasks = tasks.map(t =>
        t.id === taskId ? { ...t, status: 'failed' as const, updatedAt: Date.now() } : t
      );
      await saveTasksToStorage(updatedTasks);
      return;
    }

    // 发送通知到所有目标设备
    const results = await Promise.allSettled(
      targetKeys.map(key => sendBarkNotification(key, task))
    );

    let successCount = 0;
    let failedCount = 0;

    for (const result of results) {
      if (result.status === 'fulfilled' && result.value.success) {
        successCount++;
      } else {
        failedCount++;
      }
    }

    console.log(`Task ${taskId} executed: success=${successCount}, failed=${failedCount}`);

    // 保存执行历史记录
    const executionRecord: TaskExecutionRecord = {
      id: generateExecutionId(),
      taskId,
      executedAt: Date.now(),
      status: successCount > 0 ? 'success' : 'failed',
      targetKeyIds: task.targetKeyIds,
      successCount,
      failedCount,
    };
    
    // 收集错误信息
    const errors: string[] = [];
    for (const result of results) {
      if (result.status === 'rejected') {
        errors.push(result.reason?.message || 'Unknown error');
      } else if (!result.value.success && result.value.error) {
        errors.push(result.value.error);
      }
    }
    if (errors.length > 0) {
      executionRecord.errorMessage = errors.join('; ');
    }
    
    await saveExecutionRecord(executionRecord);

    // 更新任务状态
    const updatedTasks = tasks.map(t => {
      if (t.id !== taskId) return t;

      if (t.type === 'one-time') {
        return {
          ...t,
          status: successCount > 0 ? 'completed' as const : 'failed' as const,
          nextExecutionTime: undefined,
          lastExecutedAt: Date.now(),
          updatedAt: Date.now(),
        };
      } else {
        // 周期性任务：计算下次执行时间
        let nextExecutionTime: number | undefined = undefined;
        if (t.cronExpression) {
          const nextTime = calculateNextExecutionTime(t.cronExpression);
          if (nextTime) {
            nextExecutionTime = nextTime;
            // 注册下次执行的 Alarm
            registerTaskAlarm(t.id, nextTime);
            console.log(`Scheduled next execution for task ${t.id} at ${new Date(nextTime).toISOString()}`);
          }
        }
        return {
          ...t,
          nextExecutionTime,
          lastExecutedAt: Date.now(),
          updatedAt: Date.now(),
        };
      }
    });

    await saveTasksToStorage(updatedTasks);

  } catch (error) {
    console.error(`Failed to execute task ${taskId}:`, error);
  }
}

/**
 * 注册任务 Alarm
 */
function registerTaskAlarm(taskId: string, nextExecutionTime: number): void {
  const alarmName = getAlarmName(taskId);
  const minDelay = 60 * 1000;
  const now = Date.now();
  const delay = Math.max(nextExecutionTime - now, minDelay);

  console.log(`Background: Registering alarm ${alarmName} for ${new Date(now + delay).toISOString()}`);

  chrome.alarms.create(alarmName, {
    when: now + delay,
  });
  
  // 确认 alarm 已创建
  chrome.alarms.get(alarmName, (alarm) => {
    if (alarm) {
      console.log(`Alarm ${alarmName} confirmed created, scheduled for ${new Date(alarm.scheduledTime).toISOString()}`);
    } else {
      console.error(`Failed to create alarm ${alarmName}`);
    }
  });
}

/**
 * 取消任务 Alarm
 */
function cancelTaskAlarm(taskId: string): void {
  const alarmName = getAlarmName(taskId);
  console.log(`Background: Canceling alarm ${alarmName}`);
  chrome.alarms.clear(alarmName);
}

/**
 * 恢复所有定时任务
 */
async function restoreScheduledTasks(): Promise<void> {
  console.log('Restoring scheduled tasks...');
  try {
    const tasks = await loadTasksFromStorage();
    const now = Date.now();
    let tasksUpdated = false;
    const updatedTasks: ScheduledTask[] = [];

    for (const task of tasks) {
      if (task.status !== 'active') {
        updatedTasks.push(task);
        continue;
      }

      let taskToSave = { ...task };

      // 检查是否需要更新下次执行时间
      if (!task.nextExecutionTime || task.nextExecutionTime < now) {
        if (task.type === 'one-time') {
          // 一次性任务已过期，标记为完成
          console.log(`Task ${task.id} expired, marking as completed`);
          taskToSave = { ...taskToSave, status: 'completed' as const, updatedAt: now };
          tasksUpdated = true;
          updatedTasks.push(taskToSave);
          continue;
        } else if (task.type === 'recurring' && task.cronExpression) {
          // 周期性任务需要重新计算下次执行时间
          const nextTime = calculateNextExecutionTime(task.cronExpression);
          if (nextTime) {
            taskToSave = { ...taskToSave, nextExecutionTime: nextTime, updatedAt: now };
            tasksUpdated = true;
            console.log(`Task ${task.id} next execution recalculated: ${new Date(nextTime).toISOString()}`);
          } else {
            // 无法计算下次执行时间，跳过
            console.warn(`Cannot calculate next execution time for task ${task.id}`);
            updatedTasks.push(taskToSave);
            continue;
          }
        }
      }

      // 注册 Alarm
      if (taskToSave.nextExecutionTime) {
        registerTaskAlarm(taskToSave.id, taskToSave.nextExecutionTime);
      }

      updatedTasks.push(taskToSave);
    }

    // 如果有任务被更新，保存到存储
    if (tasksUpdated) {
      await saveTasksToStorage(updatedTasks);
    }

    console.log('Scheduled tasks restored');
  } catch (error) {
    console.error('Failed to restore scheduled tasks:', error);
  }
}

// 监听来自其他页面的消息
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  console.log('Background received message:', message.type);

  if (message.type === 'REGISTER_TASK_ALARM') {
    registerTaskAlarm(message.taskId, message.nextExecutionTime);
    sendResponse({ success: true });
  } else if (message.type === 'CANCEL_TASK_ALARM') {
    cancelTaskAlarm(message.taskId);
    sendResponse({ success: true });
  } else if (message.type === 'SYNC_TASKS_TO_STORAGE') {
    // 同步任务数据到 chrome.storage.local
    if (message.tasks) {
      saveTasksToStorage(message.tasks).then(() => {
        sendResponse({ success: true });
      });
      return true; // 保持消息通道开放
    }
  } else if (message.type === 'SYNC_KEYS_TO_STORAGE') {
    // 同步密钥数据到 chrome.storage.local
    if (message.keys) {
      chrome.storage.local.set({ [BARK_KEYS_STORAGE_KEY]: message.keys }).then(() => {
        sendResponse({ success: true });
      });
      return true;
    }
  }

  return true; // 保持消息通道开放
});

// 监听 Alarm 触发事件
chrome.alarms.onAlarm.addListener(async (alarm) => {
  console.log('Alarm triggered:', alarm.name, 'at', new Date().toISOString());

  // 检查是否为 Bark 定时任务
  if (alarm.name.startsWith(ALARM_NAME_PREFIX)) {
    const taskId = parseAlarmName(alarm.name);
    console.log('Parsed task ID:', taskId);
    if (taskId) {
      await executeScheduledTask(taskId);
      
      // 列出当前所有 alarms
      const allAlarms = await chrome.alarms.getAll();
      console.log('Current alarms after execution:', allAlarms.map(a => ({ name: a.name, scheduledTime: new Date(a.scheduledTime).toISOString() })));
    }
  }
});

// 扩展启动时恢复任务
chrome.runtime.onStartup.addListener(() => {
  console.log('Extension started, restoring scheduled tasks');
  restoreScheduledTasks();
});

// 安装/更新时恢复任务
chrome.runtime.onInstalled.addListener((details) => {
  console.log('Extension installed/updated:', details.reason);
  restoreScheduledTasks();
});

// 立即恢复任务（用于开发模式和 service worker 重新加载）
console.log('Background script loaded, restoring scheduled tasks immediately');
restoreScheduledTasks();
