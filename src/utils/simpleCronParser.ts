/**
 * 简单的 Cron 表达式解析器
 * 用于 Service Worker 环境，不依赖任何外部库
 * 支持标准 5 字段格式：分 时 日 月 周
 */

interface ParsedCron {
  minute: number[];
  hour: number[];
  day: number[];
  month: number[];
  weekday: number[];
}

/**
 * 解析单个字段
 */
function parseField(field: string, min: number, max: number): number[] | null {
  const values: number[] = [];

  try {
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
        if (isNaN(step) || step <= 0) return null;

        let start = min;
        let end = max;

        if (range !== '*') {
          if (range.includes('-')) {
            const [s, e] = range.split('-').map(n => parseInt(n, 10));
            if (isNaN(s) || isNaN(e)) return null;
            start = s;
            end = e;
          } else {
            start = parseInt(range, 10);
            if (isNaN(start)) return null;
          }
        }

        for (let i = start; i <= end; i += step) {
          if (!values.includes(i)) values.push(i);
        }
      }
      // 处理范围 start-end
      else if (segment.includes('-')) {
        const [start, end] = segment.split('-').map(n => parseInt(n, 10));
        if (isNaN(start) || isNaN(end)) return null;
        for (let i = start; i <= end; i++) {
          if (!values.includes(i)) values.push(i);
        }
      }
      // 处理单个值
      else {
        const val = parseInt(segment, 10);
        if (isNaN(val)) return null;
        if (!values.includes(val)) values.push(val);
      }
    }

    // 验证所有值在有效范围内
    for (const v of values) {
      if (v < min || v > max) return null;
    }

    return values.sort((a, b) => a - b);
  } catch {
    return null;
  }
}

/**
 * 解析 Cron 表达式
 */
export function parseSimpleCron(expression: string): ParsedCron | null {
  const parts = expression.trim().split(/\s+/);
  if (parts.length !== 5) return null;

  const minute = parseField(parts[0], 0, 59);
  const hour = parseField(parts[1], 0, 23);
  const day = parseField(parts[2], 1, 31);
  const month = parseField(parts[3], 1, 12);
  const weekday = parseField(parts[4], 0, 6);

  if (!minute || !hour || !day || !month || !weekday) {
    return null;
  }

  return { minute, hour, day, month, weekday };
}

/**
 * 验证 Cron 表达式是否有效
 */
export function validateSimpleCron(expression: string): boolean {
  return parseSimpleCron(expression) !== null;
}

/**
 * 计算下次执行时间
 */
export function getNextExecutionTime(cronExpression: string): number | null {
  const cron = parseSimpleCron(cronExpression);
  if (!cron) return null;

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
 * 获取未来 N 次执行时间
 */
export function getNextExecutionTimes(cronExpression: string, count: number = 5): Date[] {
  const cron = parseSimpleCron(cronExpression);
  if (!cron) return [];

  const results: Date[] = [];
  const now = new Date();
  const maxIterations = 366 * 24 * 60;

  const next = new Date(now);
  next.setSeconds(0);
  next.setMilliseconds(0);
  next.setMinutes(next.getMinutes() + 1);

  for (let i = 0; i < maxIterations && results.length < count; i++) {
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
      results.push(new Date(next));
    }

    next.setMinutes(next.getMinutes() + 1);
  }

  return results;
}
