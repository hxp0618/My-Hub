/**
 * 单位转换工具函数
 * 提供时间、长度、数据存储、重量单位的转换功能
 */

// ============================================================================
// 类型定义
// ============================================================================

/** 单位类别 */
export type UnitCategory = 'time' | 'length' | 'data' | 'weight';

/** 时间单位 */
export type TimeUnit = 'ms' | 's' | 'min' | 'h' | 'd';

/** 长度单位 */
export type LengthUnit = 'mm' | 'cm' | 'm' | 'km' | 'in' | 'ft';

/** 数据存储单位 */
export type DataUnit = 'B' | 'KB' | 'MB' | 'GB' | 'TB';

/** 重量单位 */
export type WeightUnit = 'g' | 'kg' | 'lb' | 'oz';

/** 通用单位类型 */
export type Unit = TimeUnit | LengthUnit | DataUnit | WeightUnit;

/** 单位配置 */
export interface UnitConfig {
  key: Unit;
  labelKey: string;
  toBase: number;
}

/** 类别配置 */
export interface CategoryConfig {
  key: UnitCategory;
  labelKey: string;
  units: UnitConfig[];
}

/** 转换结果 */
export interface ConversionResult {
  unit: Unit;
  value: string;
  rawValue: number;
}

export const UNIT_CONVERTER_ERROR_CODES = [
  'unknownCategory',
  'unknownUnit',
] as const;

export type UnitConverterErrorCode = typeof UNIT_CONVERTER_ERROR_CODES[number];

export type ReadableTimePart = 'day' | 'hour' | 'minute' | 'second';
export type ReadableTimeFormatter = (count: number, part: ReadableTimePart) => string;

// ============================================================================
// 单位配置常量
// ============================================================================

/** 时间单位配置（基准：毫秒） */
export const TIME_UNITS: UnitConfig[] = [
  { key: 'ms', labelKey: 'tools.unitConverter.units.ms', toBase: 1 },
  { key: 's', labelKey: 'tools.unitConverter.units.s', toBase: 1000 },
  { key: 'min', labelKey: 'tools.unitConverter.units.min', toBase: 60000 },
  { key: 'h', labelKey: 'tools.unitConverter.units.h', toBase: 3600000 },
  { key: 'd', labelKey: 'tools.unitConverter.units.d', toBase: 86400000 },
];

/** 长度单位配置（基准：毫米） */
export const LENGTH_UNITS: UnitConfig[] = [
  { key: 'mm', labelKey: 'tools.unitConverter.units.mm', toBase: 1 },
  { key: 'cm', labelKey: 'tools.unitConverter.units.cm', toBase: 10 },
  { key: 'm', labelKey: 'tools.unitConverter.units.m', toBase: 1000 },
  { key: 'km', labelKey: 'tools.unitConverter.units.km', toBase: 1000000 },
  { key: 'in', labelKey: 'tools.unitConverter.units.in', toBase: 25.4 },
  { key: 'ft', labelKey: 'tools.unitConverter.units.ft', toBase: 304.8 },
];

/** 数据存储单位配置（基准：字节，使用 1024 基数） */
export const DATA_UNITS: UnitConfig[] = [
  { key: 'B', labelKey: 'tools.unitConverter.units.B', toBase: 1 },
  { key: 'KB', labelKey: 'tools.unitConverter.units.KB', toBase: 1024 },
  { key: 'MB', labelKey: 'tools.unitConverter.units.MB', toBase: 1048576 },
  { key: 'GB', labelKey: 'tools.unitConverter.units.GB', toBase: 1073741824 },
  { key: 'TB', labelKey: 'tools.unitConverter.units.TB', toBase: 1099511627776 },
];

/** 重量单位配置（基准：克） */
export const WEIGHT_UNITS: UnitConfig[] = [
  { key: 'g', labelKey: 'tools.unitConverter.units.g', toBase: 1 },
  { key: 'kg', labelKey: 'tools.unitConverter.units.kg', toBase: 1000 },
  { key: 'lb', labelKey: 'tools.unitConverter.units.lb', toBase: 453.592 },
  { key: 'oz', labelKey: 'tools.unitConverter.units.oz', toBase: 28.3495 },
];

/** 所有类别配置 */
export const CATEGORY_CONFIGS: CategoryConfig[] = [
  { key: 'time', labelKey: 'tools.unitConverter.categories.time', units: TIME_UNITS },
  { key: 'length', labelKey: 'tools.unitConverter.categories.length', units: LENGTH_UNITS },
  { key: 'data', labelKey: 'tools.unitConverter.categories.data', units: DATA_UNITS },
  { key: 'weight', labelKey: 'tools.unitConverter.categories.weight', units: WEIGHT_UNITS },
];

/** 数据单位换算基数 */
export const DATA_UNIT_BASE = 1024;

const createUnitConverterError = (code: UnitConverterErrorCode) => new Error(code);

// ============================================================================
// 核心函数
// ============================================================================

/**
 * 验证输入是否为有效数字
 * @param value 输入字符串
 * @returns 是否为有效数字
 */
export function validateInput(value: string): boolean {
  if (!value || value.trim() === '') return true;
  // 允许负数和小数
  const trimmed = value.trim();
  if (!/^-?\d*\.?\d*$/.test(trimmed)) return false;
  // 确保不是只有符号
  if (trimmed === '-' || trimmed === '.' || trimmed === '-.') return false;
  const num = parseFloat(trimmed);
  return !isNaN(num) && isFinite(num);
}

/**
 * 获取类别配置
 * @param category 单位类别
 * @returns 类别配置
 */
export function getCategoryConfig(category: UnitCategory): CategoryConfig {
  const config = CATEGORY_CONFIGS.find(c => c.key === category);
  if (!config) {
    throw createUnitConverterError('unknownCategory');
  }
  return config;
}

/**
 * 获取单位配置
 * @param unit 单位
 * @param category 单位类别
 * @returns 单位配置
 */
export function getUnitConfig(unit: Unit, category: UnitCategory): UnitConfig {
  const categoryConfig = getCategoryConfig(category);
  const unitConfig = categoryConfig.units.find(u => u.key === unit);
  if (!unitConfig) {
    throw createUnitConverterError('unknownUnit');
  }
  return unitConfig;
}

/**
 * 将值从源单位转换到基准单位
 * @param value 数值
 * @param unit 源单位
 * @param category 单位类别
 * @returns 基准单位的值
 */
export function toBaseUnit(value: number, unit: Unit, category: UnitCategory): number {
  const unitConfig = getUnitConfig(unit, category);
  return value * unitConfig.toBase;
}

/**
 * 将值从基准单位转换到目标单位
 * @param baseValue 基准单位的值
 * @param unit 目标单位
 * @param category 单位类别
 * @returns 目标单位的值
 */
export function fromBaseUnit(baseValue: number, unit: Unit, category: UnitCategory): number {
  const unitConfig = getUnitConfig(unit, category);
  return baseValue / unitConfig.toBase;
}

/**
 * 格式化数值显示
 * - 极大或极小的数使用科学计数法
 * - 小数最多保留 6 位
 * @param value 数值
 * @returns 格式化后的字符串
 */
export function formatValue(value: number): string {
  if (value === 0) return '0';
  if (!isFinite(value)) return 'Infinity';
  
  const absValue = Math.abs(value);
  
  // 使用科学计数法的阈值：>= 10^9 或 < 10^-6
  if (absValue >= 1e9 || (absValue < 1e-6 && absValue > 0)) {
    return value.toExponential(6);
  }
  
  // 限制小数位数为 6 位，并移除末尾的零
  const fixed = value.toFixed(6);
  return parseFloat(fixed).toString();
}

/**
 * 执行单位转换，返回所有单位的结果
 * @param value 输入数值
 * @param sourceUnit 源单位
 * @param category 单位类别
 * @returns 所有单位的转换结果
 */
export function convertUnits(
  value: number,
  sourceUnit: Unit,
  category: UnitCategory
): ConversionResult[] {
  const categoryConfig = getCategoryConfig(category);
  
  // 转换到基准单位
  const baseValue = toBaseUnit(value, sourceUnit, category);
  
  // 转换到所有目标单位
  return categoryConfig.units.map(targetConfig => {
    const rawValue = fromBaseUnit(baseValue, targetConfig.key, category);
    return {
      unit: targetConfig.key,
      value: formatValue(rawValue),
      rawValue,
    };
  });
}

/**
 * 在两个单位之间直接转换
 * @param value 输入数值
 * @param fromUnit 源单位
 * @param toUnit 目标单位
 * @param category 单位类别
 * @returns 转换后的数值
 */
export function convert(
  value: number,
  fromUnit: Unit,
  toUnit: Unit,
  category: UnitCategory
): number {
  const baseValue = toBaseUnit(value, fromUnit, category);
  return fromBaseUnit(baseValue, toUnit, category);
}

/**
 * 将时间值转换为易读的复合单位格式
 * 例如：1.666667 分钟 -> "1分钟 40秒"
 * @param value 时间数值
 * @param unit 时间单位
 * @param formatPart 单个时间片段的格式化函数
 * @returns 易读格式字符串，如果不适用则返回 null
 */
export function formatTimeReadable(
  value: number,
  unit: TimeUnit,
  formatPart: ReadableTimeFormatter = (count, part) => {
    const labels: Record<ReadableTimePart, string> = {
      day: '天',
      hour: '小时',
      minute: '分钟',
      second: '秒',
    };
    return `${count}${labels[part]}`;
  }
): string | null {
  // 转换为秒作为中间单位
  const totalSeconds = convert(value, unit, 's', 'time');

  // 如果小于1秒，不显示复合格式
  if (totalSeconds < 1) return null;

  // 如果单位本身就是毫秒或秒，且是整数，不需要复合显示
  if ((unit === 'ms' || unit === 's') && Number.isInteger(value)) return null;

  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);

  const parts: string[] = [];

  if (days > 0) parts.push(formatPart(days, 'day'));
  if (hours > 0) parts.push(formatPart(hours, 'hour'));
  if (minutes > 0) parts.push(formatPart(minutes, 'minute'));
  if (seconds > 0 || parts.length === 0) parts.push(formatPart(seconds, 'second'));

  // 只显示最多3个单位
  return parts.slice(0, 3).join(' ');
}

// ============================================================================
// localStorage 工具函数
// ============================================================================

const STORAGE_KEY = 'unit_converter_category';

/**
 * 保存类别偏好到 localStorage
 * @param category 单位类别
 */
export function saveCategoryPreference(category: UnitCategory): void {
  try {
    localStorage.setItem(STORAGE_KEY, category);
  } catch {
    // ignore storage errors
  }
}

/**
 * 从 localStorage 加载类别偏好
 * @returns 保存的类别，如果没有则返回 null
 */
export function loadCategoryPreference(): UnitCategory | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && ['time', 'length', 'data', 'weight'].includes(stored)) {
      return stored as UnitCategory;
    }
  } catch {
    // ignore storage errors
  }
  return null;
}
