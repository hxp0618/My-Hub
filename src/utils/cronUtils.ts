/**
 * Cron 表达式工具函数
 */

import { CronExpressionParser } from 'cron-parser';
import {
  CronField,
  FieldConfig,
  FieldMetadata,
  FIELD_METADATA,
  ValidationResult,
  createDefaultFieldConfig,
} from '../types/cron';

/** 字段顺序 */
const FIELD_ORDER: CronField[] = ['minute', 'hour', 'day', 'month', 'weekday'];

function clampCronValue(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function parseStrictCronNumber(value: string | number): number | null {
  if (typeof value === 'number') {
    return Number.isSafeInteger(value) && value >= 0 ? value : null;
  }

  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) return null;

  const parsed = Number(trimmed);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

export function parseCronFieldInput(
  value: string | number,
  min: number,
  max: number,
  fallback: number
): number {
  const safeFallback = parseStrictCronNumber(fallback);
  const fallbackValue = safeFallback === null
    ? min
    : clampCronValue(safeFallback, min, max);
  const parsed = parseStrictCronNumber(value);

  if (parsed === null) return fallbackValue;

  // UI 输入可夹到字段范围内，避免生成超范围 Cron。
  return clampCronValue(parsed, min, max);
}

function parseCronExpressionNumber(value: string, min: number, max: number): number | null {
  const parsed = parseStrictCronNumber(value);
  if (parsed === null || parsed < min || parsed > max) return null;
  return parsed;
}

/**
 * 根据字段配置生成表达式片段
 * @param config 字段配置
 * @returns 表达式片段字符串
 */
export function generateFieldExpression(config: FieldConfig): string {
  switch (config.mode) {
    case 'every':
      return '*';
    case 'range':
      if (
        config.rangeStart !== undefined &&
        config.rangeEnd !== undefined
      ) {
        return `${config.rangeStart}-${config.rangeEnd}`;
      }
      return '*';
    case 'step':
      if (
        config.stepStart !== undefined &&
        config.stepInterval !== undefined &&
        config.stepInterval > 0
      ) {
        return `${config.stepStart}/${config.stepInterval}`;
      }
      return '*';
    case 'specific':
      if (config.specificValues && config.specificValues.length > 0) {
        return config.specificValues.sort((a, b) => a - b).join(',');
      }
      return '*';
    default:
      return '*';
  }
}

/**
 * 根据所有字段配置生成完整的 Cron 表达式
 * @param fieldConfigs 字段配置映射
 * @returns 完整的 Cron 表达式
 */
export function generateCronExpression(
  fieldConfigs: Record<CronField, FieldConfig>
): string {
  return FIELD_ORDER.map(field => generateFieldExpression(fieldConfigs[field])).join(' ');
}

/**
 * 解析表达式片段为字段配置
 * @param expression 表达式片段
 * @param metadata 字段元数据
 * @returns 字段配置
 */
export function parseFieldExpression(
  expression: string,
  metadata: FieldMetadata
): FieldConfig {
  const trimmed = expression.trim();

  // 每X模式: *
  if (trimmed === '*') {
    return { mode: 'every' };
  }

  // 步进模式: start/interval
  if (trimmed.includes('/')) {
    const [startPart, intervalPart] = trimmed.split('/');
    const stepStart = startPart === '*'
      ? metadata.min
      : parseCronExpressionNumber(startPart, metadata.min, metadata.max);
    const stepInterval = parseCronExpressionNumber(intervalPart, 1, metadata.max - metadata.min + 1);
    if (stepStart !== null && stepInterval !== null) {
      return {
        mode: 'step',
        stepStart,
        stepInterval,
      };
    }
  }

  // 范围模式: start-end
  if (trimmed.includes('-') && !trimmed.includes(',')) {
    const [startPart, endPart] = trimmed.split('-');
    const rangeStart = parseCronExpressionNumber(startPart, metadata.min, metadata.max);
    const rangeEnd = parseCronExpressionNumber(endPart, metadata.min, metadata.max);
    if (rangeStart !== null && rangeEnd !== null && rangeStart <= rangeEnd) {
      return {
        mode: 'range',
        rangeStart,
        rangeEnd,
      };
    }
  }

  // 指定模式: value1,value2,...
  if (trimmed.includes(',') || /^\d+$/.test(trimmed)) {
    const values = trimmed.split(',').map(v => parseCronExpressionNumber(v, metadata.min, metadata.max));
    if (values.every((v): v is number => v !== null)) {
      return {
        mode: 'specific',
        specificValues: values,
      };
    }
  }

  // 单个数值也视为指定模式
  const singleValue = parseCronExpressionNumber(trimmed, metadata.min, metadata.max);
  if (singleValue !== null) {
    return {
      mode: 'specific',
      specificValues: [singleValue],
    };
  }

  // 默认返回每X模式
  return createDefaultFieldConfig();
}

/**
 * 解析完整 Cron 表达式为字段配置映射
 * @param expression 完整的 Cron 表达式
 * @returns 字段配置映射
 */
export function parseExpressionToConfig(
  expression: string
): Record<CronField, FieldConfig> {
  const parts = expression.trim().split(/\s+/);
  const configs: Record<CronField, FieldConfig> = {
    minute: createDefaultFieldConfig(),
    hour: createDefaultFieldConfig(),
    day: createDefaultFieldConfig(),
    month: createDefaultFieldConfig(),
    weekday: createDefaultFieldConfig(),
  };

  // 标准 5 字段 Cron 表达式
  if (parts.length >= 5) {
    FIELD_ORDER.forEach((field, index) => {
      const metadata = FIELD_METADATA.find(m => m.key === field)!;
      configs[field] = parseFieldExpression(parts[index], metadata);
    });
  }

  return configs;
}

/**
 * 验证 Cron 表达式
 * @param expression Cron 表达式
 * @returns 验证结果
 */
export function validateCronExpression(expression: string): ValidationResult {
  try {
    CronExpressionParser.parse(expression);
    return {
      isValid: true,
      description: generateDescription(expression),
    };
  } catch {
    return {
      isValid: false,
      error: 'invalidExpression',
    };
  }
}

/**
 * 生成人类可读的描述
 * @param expression Cron 表达式
 * @returns 描述字符串的 i18n key
 */
export function generateDescription(expression: string): string {
  const normalized = expression.trim();

  // 匹配常见模板
  if (normalized === '* * * * *') return 'tools.cronBuilder.desc.everyMinute';
  if (normalized === '0 * * * *') return 'tools.cronBuilder.desc.everyHour';
  if (normalized === '0 0 * * *') return 'tools.cronBuilder.desc.everyDay';
  if (normalized === '0 0 * * 0') return 'tools.cronBuilder.desc.everyWeek';
  if (normalized === '0 0 1 * *') return 'tools.cronBuilder.desc.everyMonth';

  return 'tools.cronBuilder.desc.custom';
}

/**
 * 计算未来 N 次执行时间
 * @param expression Cron 表达式
 * @param count 执行次数，默认 10
 * @returns 执行时间数组
 */
export function getNextExecutions(expression: string, count: number = 10): Date[] {
  try {
    const interval = CronExpressionParser.parse(expression);
    const executions: Date[] = [];

    for (let i = 0; i < count; i++) {
      executions.push(interval.next().toDate());
    }

    return executions;
  } catch {
    return [];
  }
}

/**
 * 格式化日期时间为本地字符串
 * @param date 日期对象
 * @returns 格式化后的字符串
 */
export function formatDateTime(date: Date): string {
  return date.toLocaleString();
}
