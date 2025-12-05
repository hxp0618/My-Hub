/**
 * Cron 表达式生成器类型定义
 */

/** Cron 时间字段类型 */
export type CronField = 'minute' | 'hour' | 'day' | 'month' | 'weekday';

/** 字段配置模式 */
export type FieldMode = 'every' | 'range' | 'step' | 'specific';

/** 字段配置接口 */
export interface FieldConfig {
  mode: FieldMode;
  rangeStart?: number;
  rangeEnd?: number;
  stepStart?: number;
  stepInterval?: number;
  specificValues?: number[];
}

/** 字段元数据接口 */
export interface FieldMetadata {
  key: CronField;
  label: string; // i18n key
  min: number;
  max: number;
  defaultValue: string;
}

/** Cron 模板接口 */
export interface CronTemplate {
  key: string;
  expression: string;
  labelKey: string; // i18n key
}

/** 验证结果接口 */
export interface ValidationResult {
  isValid: boolean;
  error?: string;
  description?: string;
}

/** Cron 构建器状态接口 */
export interface CronBuilderState {
  activeTab: CronField;
  fieldConfigs: Record<CronField, FieldConfig>;
  expression: string;
  validation: ValidationResult;
  nextExecutions: Date[];
}

/** 字段元数据常量 */
export const FIELD_METADATA: FieldMetadata[] = [
  {
    key: 'minute',
    label: 'tools.cronBuilder.fields.minute',
    min: 0,
    max: 59,
    defaultValue: '*',
  },
  {
    key: 'hour',
    label: 'tools.cronBuilder.fields.hour',
    min: 0,
    max: 23,
    defaultValue: '*',
  },
  {
    key: 'day',
    label: 'tools.cronBuilder.fields.day',
    min: 1,
    max: 31,
    defaultValue: '*',
  },
  {
    key: 'month',
    label: 'tools.cronBuilder.fields.month',
    min: 1,
    max: 12,
    defaultValue: '*',
  },
  {
    key: 'weekday',
    label: 'tools.cronBuilder.fields.weekday',
    min: 0,
    max: 6,
    defaultValue: '*',
  },
];

/** Cron 模板常量 */
export const CRON_TEMPLATES: CronTemplate[] = [
  {
    key: 'everyMinute',
    expression: '* * * * *',
    labelKey: 'tools.cronBuilder.template.everyMinute',
  },
  {
    key: 'everyHour',
    expression: '0 * * * *',
    labelKey: 'tools.cronBuilder.template.everyHour',
  },
  {
    key: 'everyDay',
    expression: '0 0 * * *',
    labelKey: 'tools.cronBuilder.template.everyDay',
  },
  {
    key: 'everyWeek',
    expression: '0 0 * * 0',
    labelKey: 'tools.cronBuilder.template.everyWeek',
  },
  {
    key: 'everyMonth',
    expression: '0 0 1 * *',
    labelKey: 'tools.cronBuilder.template.everyMonth',
  },
  {
    key: 'workdayMorning',
    expression: '0 9 * * 1-5',
    labelKey: 'tools.cronBuilder.template.workdayMorning',
  },
];

/** 获取字段元数据 */
export function getFieldMetadata(field: CronField): FieldMetadata {
  const metadata = FIELD_METADATA.find(m => m.key === field);
  if (!metadata) {
    throw new Error(`Unknown cron field: ${field}`);
  }
  return metadata;
}

/** 创建默认字段配置 */
export function createDefaultFieldConfig(): FieldConfig {
  return {
    mode: 'every',
  };
}

/** 创建默认字段配置映射 */
export function createDefaultFieldConfigs(): Record<CronField, FieldConfig> {
  return {
    minute: createDefaultFieldConfig(),
    hour: createDefaultFieldConfig(),
    day: createDefaultFieldConfig(),
    month: createDefaultFieldConfig(),
    weekday: createDefaultFieldConfig(),
  };
}
