/**
 * 订阅配置导入导出服务
 * 提供订阅数据和配置的 JSON 导入导出功能
 */
import {
  Subscription,
  SubscriptionExportData,
  SubscriptionNotificationConfig,
  SubscriptionSettings,
  ImportMode,
  SubscriptionError,
  SubscriptionErrorCode,
  EXPORT_DATA_VERSION,
  DEFAULT_NOTIFICATION_CONFIG,
  DEFAULT_SUBSCRIPTION_SETTINGS,
  generateSubscriptionId,
  SubscriptionCycle,
  SubscriptionType,
  SubscriptionStatus,
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

/**
 * 导入验证结果
 */
export interface ImportValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
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
}

/**
 * 有效的订阅周期值
 */
const VALID_CYCLES: SubscriptionCycle[] = ['monthly', 'quarterly', 'semi-annual', 'annual', 'one-time'];

/**
 * 有效的订阅类型值
 */
const VALID_TYPES: SubscriptionType[] = ['video', 'music', 'cloud', 'software', 'domain', 'server', 'other'];

/**
 * 有效的订阅状态值
 */
const VALID_STATUSES: SubscriptionStatus[] = ['active', 'disabled', 'expired'];

/**
 * 验证订阅数据是否有效
 */
function validateSubscription(sub: unknown, index: number): string[] {
  const errors: string[] = [];
  
  if (!sub || typeof sub !== 'object') {
    errors.push(`订阅 #${index + 1}: 无效的数据格式`);
    return errors;
  }
  
  const s = sub as Record<string, unknown>;
  
  // 验证必需字段
  if (typeof s.name !== 'string' || s.name.trim().length === 0) {
    errors.push(`订阅 #${index + 1}: 名称不能为空`);
  }
  
  if (!VALID_TYPES.includes(s.type as SubscriptionType)) {
    errors.push(`订阅 #${index + 1}: 无效的订阅类型 "${s.type}"`);
  }
  
  if (!VALID_CYCLES.includes(s.cycle as SubscriptionCycle)) {
    errors.push(`订阅 #${index + 1}: 无效的订阅周期 "${s.cycle}"`);
  }
  
  if (typeof s.expiryDate !== 'number' || isNaN(s.expiryDate)) {
    errors.push(`订阅 #${index + 1}: 无效的到期日期`);
  }
  
  if (typeof s.reminderDays !== 'number' || s.reminderDays < 0) {
    errors.push(`订阅 #${index + 1}: 无效的提醒天数`);
  }
  
  if (typeof s.isEnabled !== 'boolean') {
    errors.push(`订阅 #${index + 1}: 无效的启用状态`);
  }
  
  return errors;
}

/**
 * 验证通知配置是否有效
 */
function validateNotificationConfig(config: unknown): string[] {
  const errors: string[] = [];
  
  if (!config || typeof config !== 'object') {
    errors.push('通知配置: 无效的数据格式');
    return errors;
  }
  
  const c = config as Record<string, unknown>;
  
  // 验证各渠道配置存在
  if (!c.telegram || typeof c.telegram !== 'object') {
    errors.push('通知配置: 缺少 Telegram 配置');
  }
  
  if (!c.email || typeof c.email !== 'object') {
    errors.push('通知配置: 缺少邮件配置');
  }
  
  if (!c.webhook || typeof c.webhook !== 'object') {
    errors.push('通知配置: 缺少 Webhook 配置');
  }
  
  if (!c.bark || typeof c.bark !== 'object') {
    errors.push('通知配置: 缺少 Bark 配置');
  }
  
  return errors;
}

/**
 * 验证设置是否有效
 */
function validateSettings(settings: unknown): string[] {
  const errors: string[] = [];
  
  if (!settings || typeof settings !== 'object') {
    errors.push('设置: 无效的数据格式');
    return errors;
  }
  
  const s = settings as Record<string, unknown>;
  
  if (typeof s.showLunarDate !== 'boolean') {
    errors.push('设置: 无效的农历显示设置');
  }
  
  if (typeof s.defaultReminderDays !== 'number' || s.defaultReminderDays < 0) {
    errors.push('设置: 无效的默认提醒天数');
  }
  
  return errors;
}

/**
 * 验证导入数据
 */
export function validateImportData(jsonString: string): ImportValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // 解析 JSON
  let data: unknown;
  try {
    data = JSON.parse(jsonString);
  } catch (e) {
    return {
      valid: false,
      errors: ['无效的 JSON 格式'],
      warnings: [],
    };
  }
  
  if (!data || typeof data !== 'object') {
    return {
      valid: false,
      errors: ['无效的数据格式'],
      warnings: [],
    };
  }
  
  const d = data as Record<string, unknown>;
  
  // 验证版本号
  if (typeof d.version !== 'string') {
    errors.push('缺少版本号');
  } else if (d.version !== EXPORT_DATA_VERSION) {
    warnings.push(`数据版本 (${d.version}) 与当前版本 (${EXPORT_DATA_VERSION}) 不同，可能存在兼容性问题`);
  }
  
  // 验证导出时间
  if (typeof d.exportedAt !== 'number') {
    warnings.push('缺少导出时间');
  }
  
  // 验证订阅数组
  if (!Array.isArray(d.subscriptions)) {
    errors.push('缺少订阅数据或格式无效');
  } else {
    d.subscriptions.forEach((sub, index) => {
      errors.push(...validateSubscription(sub, index));
    });
  }
  
  // 验证通知配置
  if (d.notificationConfig) {
    errors.push(...validateNotificationConfig(d.notificationConfig));
  } else {
    warnings.push('缺少通知配置，将使用默认配置');
  }
  
  // 验证设置
  if (d.settings) {
    errors.push(...validateSettings(d.settings));
  } else {
    warnings.push('缺少设置，将使用默认设置');
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
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
  async exportConfig(): Promise<string> {
    const subscriptions = await getAllSubscriptions();
    const notificationConfig = await getSubscriptionNotificationConfig();
    const settings = await getSubscriptionSettings();
    
    const exportData: SubscriptionExportData = {
      version: EXPORT_DATA_VERSION,
      exportedAt: Date.now(),
      subscriptions,
      notificationConfig,
      settings,
    };
    
    return JSON.stringify(exportData, null, 2);
  }
  
  /**
   * 导出配置为 Blob（用于下载）
   */
  async exportAsBlob(): Promise<Blob> {
    const jsonString = await this.exportConfig();
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
        await setSubscriptionNotificationConfig(importData.notificationConfig);
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
        errors: [error instanceof Error ? error.message : '导入失败'],
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
        });
      };
      
      reader.readAsText(file);
    });
  }
}

// 导出单例
export const subscriptionConfigExporter = new SubscriptionConfigExporter();
export default subscriptionConfigExporter;
