/**
 * 订阅配置导入导出服务
 * 提供订阅数据和配置的 JSON 导入导出功能
 */
import {
  Subscription,
  SubscriptionExportData,
  ImportMode,
  EXPORT_DATA_VERSION,
  generateSubscriptionId,
  SubscriptionCycle,
  SubscriptionType,
  DEFAULT_NOTIFICATION_CONFIG,
  NotificationChannel,
  SubscriptionStatus,
  isPageSizeOption,
} from '../types/subscription';
import {
  getAllSubscriptions,
  clearAllSubscriptions,
  batchAddSubscriptions,
  getSubscriptionSettings,
  setSubscriptionSettings,
  getSubscriptionNotificationConfig,
  setSubscriptionNotificationConfig,
} from '../db/indexedDB';
import {
  mergeSubscriptionNotificationConfigForImport,
  redactSubscriptionNotificationConfig,
} from '../utils/subscriptionNotificationConfigPrivacy';

/**
 * 导入验证结果
 */
export type ImportValidationIssueCode =
  | 'invalidJson'
  | 'invalidDataFormat'
  | 'missingVersion'
  | 'versionMismatch'
  | 'missingExportedAt'
  | 'missingSubscriptions'
  | 'invalidSubscriptionFormat'
  | 'subscriptionNameRequired'
  | 'invalidSubscriptionType'
  | 'invalidSubscriptionCycle'
  | 'invalidExpiryDate'
  | 'invalidReminderDays'
  | 'invalidEnabledState'
  | 'invalidSubscriptionStatus'
  | 'invalidNotificationChannels'
  | 'invalidCreatedAt'
  | 'invalidUpdatedAt'
  | 'invalidOptionalText'
  | 'invalidNotificationConfigFormat'
  | 'missingTelegramConfig'
  | 'missingEmailConfig'
  | 'missingWebhookConfig'
  | 'missingBarkConfig'
  | 'invalidSettingsFormat'
  | 'invalidLunarSetting'
  | 'invalidDefaultReminderDays'
  | 'invalidDailyReminder'
  | 'invalidPageSize'
  | 'importFailed';

export interface ImportValidationIssue {
  code: ImportValidationIssueCode;
  values?: Record<string, string | number>;
}

export interface ImportValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  issues: ImportValidationIssue[];
  warningIssues: ImportValidationIssue[];
  data?: SubscriptionExportData;
}

/**
 * 导入结果
 */
export interface ImportResult {
  success: boolean;
  importedCount: number;
  skippedCount: number;
  errors: string[];
  issues?: ImportValidationIssue[];
}

export interface SubscriptionExportOptions {
  includeSensitiveData?: boolean;
}

/**
 * 有效的订阅周期值
 */
const VALID_CYCLES: SubscriptionCycle[] = ['monthly', 'quarterly', 'semi-annual', 'annual', 'one-time'];

/**
 * 有效的订阅类型值
 */
const VALID_TYPES: SubscriptionType[] = ['video', 'music', 'cloud', 'software', 'domain', 'server', 'other'];

const VALID_STATUSES: SubscriptionStatus[] = ['active', 'disabled', 'expired'];

const VALID_NOTIFICATION_CHANNELS: NotificationChannel[] = ['telegram', 'email', 'webhook', 'bark'];

const isRecord = (value: unknown): value is Record<string, unknown> => (
  !!value && typeof value === 'object' && !Array.isArray(value)
);

const isFiniteNumber = (value: unknown): value is number => (
  typeof value === 'number' && Number.isFinite(value)
);

const isValidOptionalText = (value: unknown): boolean => (
  value === undefined || typeof value === 'string'
);

const isValidNotificationChannels = (value: unknown): value is NotificationChannel[] => (
  Array.isArray(value) &&
  value.every(channel => VALID_NOTIFICATION_CHANNELS.includes(channel as NotificationChannel))
);

/**
 * 验证订阅数据是否有效
 */
function validateSubscription(sub: unknown, index: number): { errors: string[]; issues: ImportValidationIssue[] } {
  const errors: string[] = [];
  const issues: ImportValidationIssue[] = [];
  const number = index + 1;
  
  if (!isRecord(sub)) {
    errors.push(`订阅 #${number}: 无效的数据格式`);
    issues.push({ code: 'invalidSubscriptionFormat', values: { number } });
    return { errors, issues };
  }
  
  const s = sub;
  
  // 验证必需字段
  if (typeof s.name !== 'string' || s.name.trim().length === 0) {
    errors.push(`订阅 #${number}: 名称不能为空`);
    issues.push({ code: 'subscriptionNameRequired', values: { number } });
  }
  
  if (!VALID_TYPES.includes(s.type as SubscriptionType)) {
    errors.push(`订阅 #${number}: 无效的订阅类型 "${s.type}"`);
    issues.push({ code: 'invalidSubscriptionType', values: { number, value: String(s.type) } });
  }
  
  if (!VALID_CYCLES.includes(s.cycle as SubscriptionCycle)) {
    errors.push(`订阅 #${number}: 无效的订阅周期 "${s.cycle}"`);
    issues.push({ code: 'invalidSubscriptionCycle', values: { number, value: String(s.cycle) } });
  }
  
  if (!isFiniteNumber(s.expiryDate)) {
    errors.push(`订阅 #${number}: 无效的到期日期`);
    issues.push({ code: 'invalidExpiryDate', values: { number } });
  }
  
  if (!isFiniteNumber(s.reminderDays) || s.reminderDays < 0) {
    errors.push(`订阅 #${number}: 无效的提醒天数`);
    issues.push({ code: 'invalidReminderDays', values: { number } });
  }
  
  if (typeof s.isEnabled !== 'boolean') {
    errors.push(`订阅 #${number}: 无效的启用状态`);
    issues.push({ code: 'invalidEnabledState', values: { number } });
  }

  if (!VALID_STATUSES.includes(s.status as SubscriptionStatus)) {
    errors.push(`订阅 #${number}: 无效的订阅状态 "${s.status}"`);
    issues.push({ code: 'invalidSubscriptionStatus', values: { number, value: String(s.status) } });
  }

  if (!isValidNotificationChannels(s.notificationChannels)) {
    errors.push(`订阅 #${number}: 无效的通知渠道`);
    issues.push({ code: 'invalidNotificationChannels', values: { number } });
  }

  if (s.createdAt !== undefined && !isFiniteNumber(s.createdAt)) {
    errors.push(`订阅 #${number}: 无效的创建时间`);
    issues.push({ code: 'invalidCreatedAt', values: { number } });
  }

  if (s.updatedAt !== undefined && !isFiniteNumber(s.updatedAt)) {
    errors.push(`订阅 #${number}: 无效的更新时间`);
    issues.push({ code: 'invalidUpdatedAt', values: { number } });
  }

  if (!isValidOptionalText(s.customType) || !isValidOptionalText(s.url) || !isValidOptionalText(s.notes)) {
    errors.push(`订阅 #${number}: 可选文本字段格式无效`);
    issues.push({ code: 'invalidOptionalText', values: { number } });
  }
  
  return { errors, issues };
}

/**
 * 验证通知配置是否有效
 */
function validateNotificationConfig(config: unknown): { errors: string[]; issues: ImportValidationIssue[] } {
  const errors: string[] = [];
  const issues: ImportValidationIssue[] = [];
  
  if (!config || typeof config !== 'object') {
    errors.push('通知配置: 无效的数据格式');
    issues.push({ code: 'invalidNotificationConfigFormat' });
    return { errors, issues };
  }
  
  const c = config as Record<string, unknown>;
  
  // 验证各渠道配置存在
  if (!c.telegram || typeof c.telegram !== 'object') {
    errors.push('通知配置: 缺少 Telegram 配置');
    issues.push({ code: 'missingTelegramConfig' });
  }
  
  if (!c.email || typeof c.email !== 'object') {
    errors.push('通知配置: 缺少邮件配置');
    issues.push({ code: 'missingEmailConfig' });
  }
  
  if (!c.webhook || typeof c.webhook !== 'object') {
    errors.push('通知配置: 缺少 Webhook 配置');
    issues.push({ code: 'missingWebhookConfig' });
  }
  
  if (!c.bark || typeof c.bark !== 'object') {
    errors.push('通知配置: 缺少 Bark 配置');
    issues.push({ code: 'missingBarkConfig' });
  }
  
  return { errors, issues };
}

/**
 * 验证设置是否有效
 */
function validateSettings(settings: unknown): { errors: string[]; issues: ImportValidationIssue[] } {
  const errors: string[] = [];
  const issues: ImportValidationIssue[] = [];
  
  if (!settings || typeof settings !== 'object') {
    errors.push('设置: 无效的数据格式');
    issues.push({ code: 'invalidSettingsFormat' });
    return { errors, issues };
  }
  
  const s = settings as Record<string, unknown>;
  
  if (typeof s.showLunarDate !== 'boolean') {
    errors.push('设置: 无效的农历显示设置');
    issues.push({ code: 'invalidLunarSetting' });
  }
  
  if (!isFiniteNumber(s.defaultReminderDays) || s.defaultReminderDays < 0) {
    errors.push('设置: 无效的默认提醒天数');
    issues.push({ code: 'invalidDefaultReminderDays' });
  }

  if (typeof s.dailyReminder !== 'boolean') {
    errors.push('设置: 无效的每日提醒设置');
    issues.push({ code: 'invalidDailyReminder' });
  }

  if (!isPageSizeOption(s.pageSize)) {
    errors.push('设置: 无效的分页数量');
    issues.push({ code: 'invalidPageSize' });
  }
  
  return { errors, issues };
}

/**
 * 验证导入数据
 */
export function validateImportData(jsonString: string): ImportValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const issues: ImportValidationIssue[] = [];
  const warningIssues: ImportValidationIssue[] = [];
  
  // 解析 JSON
  let data: unknown;
  try {
    data = JSON.parse(jsonString);
  } catch (e) {
    return {
      valid: false,
      errors: ['无效的 JSON 格式'],
      warnings: [],
      issues: [{ code: 'invalidJson' }],
      warningIssues: [],
    };
  }
  
  if (!data || typeof data !== 'object') {
    return {
      valid: false,
      errors: ['无效的数据格式'],
      warnings: [],
      issues: [{ code: 'invalidDataFormat' }],
      warningIssues: [],
    };
  }
  
  const d = data as Record<string, unknown>;
  
  // 验证版本号
  if (typeof d.version !== 'string') {
    errors.push('缺少版本号');
    issues.push({ code: 'missingVersion' });
  } else if (d.version !== EXPORT_DATA_VERSION) {
    warnings.push(`数据版本 (${d.version}) 与当前版本 (${EXPORT_DATA_VERSION}) 不同，可能存在兼容性问题`);
    warningIssues.push({
      code: 'versionMismatch',
      values: { version: d.version, currentVersion: EXPORT_DATA_VERSION },
    });
  }
  
  // 验证导出时间
  if (typeof d.exportedAt !== 'number') {
    warnings.push('缺少导出时间');
    warningIssues.push({ code: 'missingExportedAt' });
  }
  
  // 验证订阅数组
  if (!Array.isArray(d.subscriptions)) {
    errors.push('缺少订阅数据或格式无效');
    issues.push({ code: 'missingSubscriptions' });
  } else {
    d.subscriptions.forEach((sub, index) => {
      const result = validateSubscription(sub, index);
      errors.push(...result.errors);
      issues.push(...result.issues);
    });
  }
  
  // 验证通知配置
  if (d.notificationConfig) {
    const result = validateNotificationConfig(d.notificationConfig);
    errors.push(...result.errors);
    issues.push(...result.issues);
  } else {
    warnings.push('缺少通知配置，将使用默认配置');
    warningIssues.push({ code: 'invalidNotificationConfigFormat' });
  }
  
  // 验证设置
  if (d.settings) {
    const result = validateSettings(d.settings);
    errors.push(...result.errors);
    issues.push(...result.issues);
  } else {
    warnings.push('缺少设置，将使用默认设置');
    warningIssues.push({ code: 'invalidSettingsFormat' });
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    issues,
    warningIssues,
    data: errors.length === 0 ? (data as SubscriptionExportData) : undefined,
  };
}

/**
 * 配置导出服务类
 */
class SubscriptionConfigExporter {
  /**
   * 导出所有配置为 JSON 字符串
   */
  async exportConfig(options: SubscriptionExportOptions = {}): Promise<string> {
    const subscriptions = await getAllSubscriptions();
    const notificationConfig = await getSubscriptionNotificationConfig();
    const settings = await getSubscriptionSettings();
    const includeSensitiveData = options.includeSensitiveData === true;
    
    const exportData: SubscriptionExportData = {
      version: EXPORT_DATA_VERSION,
      exportedAt: Date.now(),
      subscriptions,
      // 默认备份不携带可直接发送通知的密钥，避免 JSON 文件泄露后被滥用。
      notificationConfig: includeSensitiveData
        ? notificationConfig
        : redactSubscriptionNotificationConfig(notificationConfig),
      settings,
    };
    
    return JSON.stringify(exportData, null, 2);
  }
  
  /**
   * 导出配置为 Blob（用于下载）
   */
  async exportAsBlob(options: SubscriptionExportOptions = {}): Promise<Blob> {
    const jsonString = await this.exportConfig(options);
    return new Blob([jsonString], { type: 'application/json' });
  }
  
  /**
   * 生成导出文件名
   */
  generateExportFilename(): string {
    const date = new Date().toISOString().split('T')[0];
    return `subscriptions-backup-${date}.json`;
  }
  
  /**
   * 验证导入数据
   */
  validateImport(jsonString: string): ImportValidationResult {
    return validateImportData(jsonString);
  }
  
  /**
   * 导入配置
   * @param jsonString JSON 字符串
   * @param mode 导入模式：overwrite（覆盖）或 merge（合并）
   */
  async importConfig(jsonString: string, mode: ImportMode = 'overwrite'): Promise<ImportResult> {
    // 验证数据
    const validation = this.validateImport(jsonString);
    
    if (!validation.valid || !validation.data) {
      return {
        success: false,
        importedCount: 0,
        skippedCount: 0,
        errors: validation.errors,
        issues: validation.issues,
      };
    }
    
    const importData = validation.data;
    const errors: string[] = [];
    let importedCount = 0;
    let skippedCount = 0;
    
    try {
      if (mode === 'overwrite') {
        // 覆盖模式：清空现有数据后导入
        await clearAllSubscriptions();
        
        // 为每个订阅生成新 ID 并更新时间戳
        const now = Date.now();
        const subscriptionsToImport = importData.subscriptions.map(sub => ({
          ...sub,
          id: generateSubscriptionId(),
          createdAt: sub.createdAt || now,
          updatedAt: now,
        }));
        
        await batchAddSubscriptions(subscriptionsToImport);
        importedCount = subscriptionsToImport.length;
      } else {
        // 合并模式：保留现有数据，添加新数据
        const existingSubscriptions = await getAllSubscriptions();
        const existingNames = new Set(existingSubscriptions.map(s => s.name.toLowerCase()));
        
        const now = Date.now();
        const subscriptionsToImport: Subscription[] = [];
        
        for (const sub of importData.subscriptions) {
          if (existingNames.has(sub.name.toLowerCase())) {
            skippedCount++;
          } else {
            subscriptionsToImport.push({
              ...sub,
              id: generateSubscriptionId(),
              createdAt: sub.createdAt || now,
              updatedAt: now,
            });
          }
        }
        
        if (subscriptionsToImport.length > 0) {
          await batchAddSubscriptions(subscriptionsToImport);
        }
        importedCount = subscriptionsToImport.length;
      }
      
      // 导入通知配置
      if (importData.notificationConfig) {
        const existingConfig = await getSubscriptionNotificationConfig();
        const mergedConfig = mergeSubscriptionNotificationConfigForImport(
          {
            ...DEFAULT_NOTIFICATION_CONFIG,
            ...importData.notificationConfig,
          },
          existingConfig
        );
        await setSubscriptionNotificationConfig({
          ...DEFAULT_NOTIFICATION_CONFIG,
          ...mergedConfig,
        });
      }
      
      // 导入设置
      if (importData.settings) {
        await setSubscriptionSettings(importData.settings);
      }
      
      return {
        success: true,
        importedCount,
        skippedCount,
        errors,
      };
    } catch (error) {
      return {
        success: false,
        importedCount: 0,
        skippedCount: 0,
        errors: ['导入失败'],
        issues: [{ code: 'importFailed' }],
      };
    }
  }
  
  /**
   * 从文件导入配置
   */
  async importFromFile(file: File, mode: ImportMode = 'overwrite'): Promise<ImportResult> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        const content = e.target?.result;
        if (typeof content !== 'string') {
          resolve({
            success: false,
            importedCount: 0,
            skippedCount: 0,
            errors: ['无法读取文件内容'],
            issues: [],
          });
          return;
        }
        
        const result = await this.importConfig(content, mode);
        resolve(result);
      };
      
      reader.onerror = () => {
        resolve({
          success: false,
          importedCount: 0,
          skippedCount: 0,
          errors: ['文件读取失败'],
          issues: [],
        });
      };
      
      reader.readAsText(file);
    });
  }
}

// 导出单例
export const subscriptionConfigExporter = new SubscriptionConfigExporter();
export default subscriptionConfigExporter;
