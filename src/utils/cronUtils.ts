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
    const stepStart = startPart === '*' ? metadata.min : parseInt(startPart, 10);
    const stepInterval = parseInt(intervalPart, 10);
    if (!isNaN(stepStart) && !isNaN(stepInterval) && stepInterval > 0) {
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
    const rangeStart = parseInt(startPart, 10);
    const rangeEnd = parseInt(endPart, 10);
    if (!isNaN(rangeStart) && !isNaN(rangeEnd)) {
      return {
        mode: 'range',
        rangeStart,
        rangeEnd,
      };
    }
  }

  // 指定模式: value1,value2,...
  if (trimmed.includes(',') || /^\d+$/.test(trimmed)) {
    const values = trimmed.split(',').map(v => parseInt(v.trim(), 10));
    if (values.every(v => !isNaN(v))) {
      return {
        mode: 'specific',
        specificValues: values,
      };
    }
  }

  // 单个数值也视为指定模式
  const singleValue = parseInt(trimmed, 10);
  if (!isNaN(singleValue)) {
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
  } catch (e) {
    return {
      isValid: false,
      error: e instanceof Error ? e.message : 'Invalid cron expression',
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
