/**
 * Bark 密钥管理工具函数
 * 提供密钥配置的基础操作函数
 */

import { BarkKeyConfig, sanitizeBarkKeys } from '../types/bark';
import i18n from '../i18n';
import { createLogger } from './logger';

const barkKeyLogger = createLogger('[BarkKeyManager]');

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
  return i18n.t('tools.barkNotifier.keys.defaultLabel', { count });
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

const isNonEmptyString = (value: unknown): value is string => (
  typeof value === 'string' && value.trim().length > 0
);

const parseOldConfig = (stored: string): OldBarkConfig | null => {
  try {
    const parsed: unknown = JSON.parse(stored);
    if (!parsed || typeof parsed !== 'object') return null;

    const candidate = parsed as Partial<OldBarkConfig>;
    if (!isNonEmptyString(candidate.deviceKey)) return null;

    return {
      server: isNonEmptyString(candidate.server) ? candidate.server : 'https://api.day.app',
      deviceKey: candidate.deviceKey,
    };
  } catch (e) {
    barkKeyLogger.error('Failed to parse old Bark config', e);
    return null;
  }
};

/**
 * 保存所有密钥配置到本地存储
 * 
 * @param keys 密钥配置列表
 * @throws 如果保存失败则抛出错误
 */
export function saveKeys(keys: BarkKeyConfig[]): void {
  try {
    localStorage.setItem(BARK_KEYS_STORAGE_KEY, JSON.stringify(sanitizeBarkKeys(keys)));
  } catch (e) {
    barkKeyLogger.error('Failed to save Bark keys', e);
    throw new Error('saveFailed');
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

    const parsed: unknown = JSON.parse(stored);

    // 验证数据结构
    if (!Array.isArray(parsed)) {
      throw new Error('Invalid data structure');
    }

    const validKeys = sanitizeBarkKeys(parsed);
    if (validKeys.length !== parsed.length) {
      // 只保留结构完整的密钥项，避免局部脏数据污染管理器状态。
      if (validKeys.length > 0) {
        localStorage.setItem(BARK_KEYS_STORAGE_KEY, JSON.stringify(validKeys));
      } else {
        localStorage.removeItem(BARK_KEYS_STORAGE_KEY);
      }
    }

    return validKeys;
  } catch (e) {
    barkKeyLogger.error('Failed to load Bark keys', e);
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
    barkKeyLogger.error('Failed to save selected key ID', e);
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
    barkKeyLogger.error('Failed to load selected key ID', e);
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
  try {
    const oldConfig = localStorage.getItem(BARK_OLD_CONFIG_KEY);
    const existingKeys = localStorage.getItem(BARK_KEYS_STORAGE_KEY);

    // 如果已经有新配置，不需要迁移
    if (existingKeys || !oldConfig) {
      return;
    }

    const parsedOldConfig = parseOldConfig(oldConfig);
    if (!parsedOldConfig) {
      return;
    }

    const migratedKey: BarkKeyConfig = {
      id: generateKeyId(),
      deviceKey: parsedOldConfig.deviceKey,
      server: parsedOldConfig.server,
      label: i18n.t('tools.barkNotifier.keys.migratedDefaultLabel'),
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    localStorage.setItem(BARK_KEYS_STORAGE_KEY, JSON.stringify([migratedKey]));
    localStorage.setItem(BARK_SELECTED_KEY_ID_STORAGE_KEY, migratedKey.id);

    barkKeyLogger.debug('Migrated old Bark config to multi-key system');
  } catch (e) {
    barkKeyLogger.error('Failed to migrate old Bark config', e);
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
