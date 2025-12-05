/**
 * Bark 密钥管理工具函数
 * 提供密钥配置的基础操作函数
 */

import { BarkKeyConfig } from '../types/bark';

/**
 * 生成唯一的密钥配置 ID
 * 格式: bark_key_{timestamp}_{random}
 * 
 * @returns 唯一的密钥 ID
 */
export function generateKeyId(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substr(2, 9);
  return `bark_key_${timestamp}_${random}`;
}

/**
 * 生成默认备注
 * 格式：设备 N，N 从 1 开始
 * 
 * @param existingKeys 现有的密钥配置列表
 * @returns 默认备注字符串
 */
export function generateDefaultLabel(existingKeys: BarkKeyConfig[]): string {
  const count = existingKeys.length + 1;
  return `设备 ${count}`;
}

/**
 * 脱敏显示设备密钥
 * 显示前 3 位和后 3 位，中间用 *** 代替
 * 如果密钥长度 <= 6，则直接返回原密钥
 * 
 * @param key 设备密钥
 * @returns 脱敏后的密钥字符串
 */
export function maskDeviceKey(key: string): string {
  if (key.length <= 6) {
    return key;
  }
  const start = key.slice(0, 3);
  const end = key.slice(-3);
  return `${start}***${end}`;
}


// 存储键常量
const BARK_KEYS_STORAGE_KEY = 'bark_keys';
const BARK_SELECTED_KEY_ID_STORAGE_KEY = 'bark_selected_key_id';
const BARK_OLD_CONFIG_KEY = 'bark_config';

/**
 * 保存所有密钥配置到本地存储
 * 
 * @param keys 密钥配置列表
 * @throws 如果保存失败则抛出错误
 */
export function saveKeys(keys: BarkKeyConfig[]): void {
  try {
    localStorage.setItem(BARK_KEYS_STORAGE_KEY, JSON.stringify(keys));
  } catch (e) {
    console.error('Failed to save Bark keys:', e);
    throw new Error('保存失败，请重试');
  }
}

/**
 * 从本地存储加载所有密钥配置
 * 如果数据损坏，会清空存储并返回空数组
 * 
 * @returns 密钥配置列表
 */
export function loadKeys(): BarkKeyConfig[] {
  try {
    const stored = localStorage.getItem(BARK_KEYS_STORAGE_KEY);
    if (!stored) {
      return [];
    }
    
    const keys = JSON.parse(stored);
    
    // 验证数据结构
    if (!Array.isArray(keys)) {
      throw new Error('Invalid data structure');
    }
    
    return keys;
  } catch (e) {
    console.error('Failed to load Bark keys:', e);
    // 数据损坏时清空并返回空数组
    localStorage.removeItem(BARK_KEYS_STORAGE_KEY);
    return [];
  }
}

/**
 * 保存选中的密钥 ID
 * 
 * @param keyId 密钥 ID，如果为 null 则清除选中状态
 */
export function saveSelectedKeyId(keyId: string | null): void {
  try {
    if (keyId) {
      localStorage.setItem(BARK_SELECTED_KEY_ID_STORAGE_KEY, keyId);
    } else {
      localStorage.removeItem(BARK_SELECTED_KEY_ID_STORAGE_KEY);
    }
  } catch (e) {
    console.error('Failed to save selected key ID:', e);
  }
}

/**
 * 加载选中的密钥 ID
 * 
 * @returns 选中的密钥 ID，如果没有则返回 null
 */
export function loadSelectedKeyId(): string | null {
  try {
    return localStorage.getItem(BARK_SELECTED_KEY_ID_STORAGE_KEY);
  } catch (e) {
    console.error('Failed to load selected key ID:', e);
    return null;
  }
}


/**
 * 旧的 Bark 配置接口（用于迁移）
 */
interface OldBarkConfig {
  server: string;
  deviceKey: string;
}

/**
 * 迁移旧的单密钥配置到新的多密钥系统
 * 如果已经有新配置，则不执行迁移
 * 如果有旧配置，则迁移到新系统并保留旧配置
 */
export function migrateOldConfig(): void {
  const oldConfig = localStorage.getItem(BARK_OLD_CONFIG_KEY);
  const existingKeys = localStorage.getItem(BARK_KEYS_STORAGE_KEY);
  
  // 如果已经有新配置，不需要迁移
  if (existingKeys) {
    return;
  }
  
  // 如果有旧配置，迁移到新系统
  if (oldConfig) {
    try {
      const { server, deviceKey }: OldBarkConfig = JSON.parse(oldConfig);
      if (deviceKey) {
        const migratedKey: BarkKeyConfig = {
          id: generateKeyId(),
          deviceKey,
          server: server || 'https://api.day.app',
          label: '默认设备',
          createdAt: Date.now(),
          updatedAt: Date.now()
        };
        
        localStorage.setItem(BARK_KEYS_STORAGE_KEY, JSON.stringify([migratedKey]));
        localStorage.setItem(BARK_SELECTED_KEY_ID_STORAGE_KEY, migratedKey.id);
        
        console.log('Successfully migrated old Bark config to new multi-key system');
      }
    } catch (e) {
      console.error('Failed to migrate old Bark config:', e);
    }
  }
}


/**
 * 验证设备密钥
 * 
 * @param key 设备密钥
 * @returns 验证结果，包含是否有效和错误信息
 */
export function validateDeviceKey(key: string): { valid: boolean; error?: string } {
  const trimmed = key.trim();
  
  if (trimmed.length === 0) {
    return { valid: false, error: 'emptyDeviceKey' };
  }
  
  return { valid: true };
}

/**
 * 验证备注
 * 
 * @param label 备注文本
 * @returns 验证结果，包含是否有效和错误信息
 */
export function validateLabel(label: string): { valid: boolean; error?: string } {
  if (label.length > 50) {
    return { valid: false, error: 'labelTooLong' };
  }
  
  return { valid: true };
}

/**
 * 验证服务器地址
 * 
 * @param server 服务器地址
 * @returns 验证结果，包含是否有效和错误信息
 */
export function validateServer(server: string): { valid: boolean; error?: string } {
  try {
    new URL(server);
    return { valid: true };
  } catch {
    return { valid: false, error: 'invalidServer' };
  }
}
