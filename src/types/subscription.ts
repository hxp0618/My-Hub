/**
 * 订阅管理工具类型定义
 * 定义订阅管理功能的核心类型和接口
 */

/**
 * 订阅周期类型
 */
export type SubscriptionCycle =
  | 'monthly'      // 月付
  | 'quarterly'    // 季付
  | 'semi-annual'  // 半年付
  | 'annual'       // 年付
  | 'one-time';    // 一次性

/**
 * 订阅状态
 */
export type SubscriptionStatus =
  | 'active'       // 启用
  | 'disabled'     // 停用
  | 'expired';     // 已过期

/**
 * 预设订阅类型
 */
export type SubscriptionType =
  | 'video'        // 视频会员
  | 'music'        // 音乐会员
  | 'cloud'        // 云存储
  | 'software'     // 软件订阅
  | 'domain'       // 域名
  | 'server'       // 服务器
  | 'other';       // 其他

/**
 * 订阅数据接口
 */
export interface Subscription {
  id: string;                    // 唯一标识符
  name: string;                  // 订阅名称
  type: SubscriptionType;        // 订阅类型
  customType?: string;           // 自定义类型（当 type 为 'other' 时）
  cycle: SubscriptionCycle;      // 订阅周期
  expiryDate: number;            // 到期时间戳（毫秒）
  reminderDays: number;          // 提前提醒天数
  notificationChannels: NotificationChannel[]; // 通知渠道（多选）
  status: SubscriptionStatus;    // 订阅状态
  isEnabled: boolean;            // 是否启用
  url?: string;                  // 订阅地址（可选）
  notes?: string;                // 备注
  createdAt: number;             // 创建时间戳
  updatedAt: number;             // 更新时间戳
}

/**
 * 通知渠道类型
 */
export type NotificationChannel =
  | 'telegram'
  | 'email'
  | 'webhook'
  | 'bark';

/**
 * Telegram 通知配置
 */
export interface TelegramConfig {
  enabled: boolean;
  botToken: string;
  chatId: string;
}

/**
 * 邮件通知配置（使用 Resend）
 */
export interface EmailConfig {
  enabled: boolean;
  resendApiKey: string;
  recipientEmail: string;
  senderEmail?: string;
}

/**
 * Webhook 通知配置
 */
export interface WebhookConfig {
  enabled: boolean;
  url: string;
  headers?: Record<string, string>;
  method?: 'GET' | 'POST';
}


/**
 * Bark 通知配置（订阅管理专用）
 */
export interface SubscriptionBarkConfig {
  enabled: boolean;
  useExistingKey: boolean;       // 是否使用已配置的 Bark Key
  existingKeyId?: string;        // 已配置的 Bark Key ID
  server?: string;               // 自定义服务器地址
  deviceKey?: string;            // 自定义设备密钥
}

/**
 * 通知配置
 */
export interface SubscriptionNotificationConfig {
  telegram: TelegramConfig;
  email: EmailConfig;
  webhook: WebhookConfig;
  bark: SubscriptionBarkConfig;
}

/**
 * 订阅设置
 */
export interface SubscriptionSettings {
  showLunarDate: boolean;        // 显示农历日期
  defaultReminderDays: number;   // 默认提醒天数
  dailyReminder: boolean;        // 是否每日重复提醒（从提前天数到到期日）
  pageSize: number;              // 每页显示数量
}

/**
 * 导出数据格式
 */
export interface SubscriptionExportData {
  version: string;               // 数据版本号
  exportedAt: number;            // 导出时间戳
  subscriptions: Subscription[];
  notificationConfig: SubscriptionNotificationConfig;
  settings: SubscriptionSettings;
}

/**
 * 导入模式
 */
export type ImportMode = 'overwrite' | 'merge';

/**
 * 农历日期接口
 */
export interface LunarDate {
  year: number;
  month: number;
  day: number;
  isLeapMonth: boolean;
  monthName: string;
  dayName: string;
}

/**
 * 通知内容接口
 */
export interface NotificationContent {
  title: string;
  body: string;
  subscriptionName: string;
  expiryDate: string;
  remainingDays: number;
}

/**
 * 订阅错误码
 */
export enum SubscriptionErrorCode {
  INVALID_NAME = 'INVALID_NAME',                     // 无效的订阅名称
  INVALID_DATE = 'INVALID_DATE',                     // 无效的日期
  NOT_FOUND = 'NOT_FOUND',                           // 订阅不存在
  STORAGE_ERROR = 'STORAGE_ERROR',                   // 存储错误
  IMPORT_INVALID_FORMAT = 'IMPORT_INVALID_FORMAT',   // 导入格式无效
  IMPORT_INVALID_DATA = 'IMPORT_INVALID_DATA',       // 导入数据无效
  NOTIFICATION_FAILED = 'NOTIFICATION_FAILED',       // 通知发送失败
  NETWORK_ERROR = 'NETWORK_ERROR',                   // 网络错误
}

/**
 * 订阅错误类
 */
export class SubscriptionError extends Error {
  constructor(
    public code: SubscriptionErrorCode,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'SubscriptionError';
  }
}

/**
 * 订阅创建参数（不包含自动生成的字段）
 */
export type CreateSubscriptionParams = Omit<Subscription, 'id' | 'createdAt' | 'updatedAt' | 'status'>;

/**
 * 订阅更新参数
 */
export type UpdateSubscriptionParams = Partial<Omit<Subscription, 'id' | 'createdAt'>>;

/**
 * 默认通知配置
 */
export const DEFAULT_NOTIFICATION_CONFIG: SubscriptionNotificationConfig = {
  telegram: {
    enabled: false,
    botToken: '',
    chatId: '',
  },
  email: {
    enabled: false,
    resendApiKey: '',
    recipientEmail: '',
  },
  webhook: {
    enabled: false,
    url: '',
    method: 'POST',
  },
  bark: {
    enabled: false,
    useExistingKey: true,
  },
};

/**
 * 分页选项
 */
export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;
export type PageSizeOption = typeof PAGE_SIZE_OPTIONS[number];

/**
 * 分页状态
 */
export interface PaginationState {
  currentPage: number;           // 当前页码（从1开始）
  pageSize: number;              // 每页显示数量
  totalItems: number;            // 总条目数
  totalPages: number;            // 总页数
}

/**
 * 默认订阅设置
 */
export const DEFAULT_SUBSCRIPTION_SETTINGS: SubscriptionSettings = {
  showLunarDate: false,
  defaultReminderDays: 7,
  dailyReminder: true,  // 默认开启每日提醒
  pageSize: 10,         // 默认每页显示10条
};

/**
 * 默认每页显示数量
 */
export const DEFAULT_PAGE_SIZE: PageSizeOption = 10;

/**
 * 订阅类型图标映射
 */
export const SUBSCRIPTION_TYPE_ICONS: Record<SubscriptionType, string> = {
  video: 'movie',
  music: 'music_note',
  cloud: 'cloud',
  software: 'apps',
  domain: 'language',
  server: 'dns',
  other: 'category',
};

/**
 * 订阅类型颜色映射
 */
export const SUBSCRIPTION_TYPE_COLORS: Record<SubscriptionType, string> = {
  video: '#f771a7',    // Pink
  music: '#71b4ea',    // Blue
  cloud: '#5fe0a8',    // Green
  software: '#f8d773', // Yellow
  domain: '#a78bfa',   // Purple
  server: '#fb923c',   // Orange
  other: '#94a3b8',    // Gray
};

/**
 * 导出数据版本号
 */
export const EXPORT_DATA_VERSION = '1.0.0';

/**
 * 生成订阅 ID
 */
export function generateSubscriptionId(): string {
  return `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
