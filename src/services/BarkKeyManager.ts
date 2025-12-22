/**
 * Bark 密钥管理器
 * 提供密钥配置的 CRUD 操作和选择管理
 */

import { BarkKeyConfig, IKeyManager } from '../types/bark';
import {
  generateKeyId,
  generateDefaultLabel,
  loadKeys,
  saveKeys,
  loadSelectedKeyId,
  saveSelectedKeyId,
  validateDeviceKey,
} from '../utils/barkKeyManager';

/** 存储键常量 - 与 background script 保持一致 */
const BARK_KEYS_STORAGE_KEY = 'bark_keys';

/**
 * 同步密钥数据到 chrome.storage.local（供 background script 使用）
 */
function syncKeysToBackground(keys: BarkKeyConfig[]): void {
  if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) {
    return;
  }

  chrome.runtime.sendMessage({
    type: 'SYNC_KEYS_TO_STORAGE',
    keys,
  }).catch(() => {
    // 忽略错误，background script 可能还没准备好
  });
}

/**
 * Bark 密钥管理器类
 * 实现 IKeyManager 接口，提供完整的密钥管理功能
 */
export class BarkKeyManager implements IKeyManager {
  private keys: BarkKeyConfig[] = [];
  private selectedKeyId: string | null = null;

  constructor() {
    // 加载现有配置
    this.keys = loadKeys();
    this.selectedKeyId = loadSelectedKeyId();

    // 如果有密钥但没有选中任何密钥，自动选中第一个
    if (this.keys.length > 0 && !this.selectedKeyId) {
      this.selectedKeyId = this.keys[0].id;
      saveSelectedKeyId(this.selectedKeyId);
    }

    // 初始化时同步到 background
    syncKeysToBackground(this.keys);
  }

  /**
   * 获取所有密钥配置
   */
  getAllKeys(): BarkKeyConfig[] {
    return [...this.keys];
  }

  /**
   * 添加新密钥配置
   *
   * @param config 密钥配置（不含 id、createdAt、updatedAt）
   * @returns 添加后的完整配置
   * @throws 如果设备密钥为空或重复
   */
  addKey(config: Omit<BarkKeyConfig, 'id' | 'createdAt' | 'updatedAt'>): BarkKeyConfig {
    // 验证设备密钥
    const validation = validateDeviceKey(config.deviceKey);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    // 检查重复
    if (this.isDuplicateKey(config.deviceKey)) {
      throw new Error('duplicateKey');
    }

    // 生成默认备注（如果为空）
    const label = config.label.trim() || generateDefaultLabel(this.keys);

    // 创建新配置
    const now = Date.now();
    const newKey: BarkKeyConfig = {
      id: generateKeyId(),
      deviceKey: config.deviceKey.trim(),
      server: config.server || 'https://api.day.app',
      label,
      createdAt: now,
      updatedAt: now,
    };

    // 添加到列表
    this.keys.unshift(newKey); // 添加到开头（最新的在前）
    saveKeys(this.keys);

    // 同步到 background
    syncKeysToBackground(this.keys);

    // 如果这是第一个密钥，自动选中
    if (this.keys.length === 1) {
      this.selectedKeyId = newKey.id;
      saveSelectedKeyId(this.selectedKeyId);
    }

    return newKey;
  }


  /**
   * 更新密钥配置
   *
   * @param id 密钥 ID
   * @param updates 要更新的字段
   * @returns 更新后的配置
   * @throws 如果密钥不存在或设备密钥重复
   */
  updateKey(id: string, updates: Partial<Omit<BarkKeyConfig, 'id' | 'createdAt'>>): BarkKeyConfig {
    const index = this.keys.findIndex(k => k.id === id);
    if (index === -1) {
      throw new Error('notFound');
    }

    const existingKey = this.keys[index];

    // 如果更新设备密钥，需要验证
    if (updates.deviceKey !== undefined) {
      const validation = validateDeviceKey(updates.deviceKey);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      // 检查重复（排除当前密钥）
      if (this.isDuplicateKey(updates.deviceKey, id)) {
        throw new Error('duplicateKey');
      }
    }

    // 更新配置
    const updatedKey: BarkKeyConfig = {
      ...existingKey,
      ...updates,
      id: existingKey.id, // 确保 ID 不变
      createdAt: existingKey.createdAt, // 确保创建时间不变
      updatedAt: Date.now(),
    };

    this.keys[index] = updatedKey;
    saveKeys(this.keys);

    // 同步到 background
    syncKeysToBackground(this.keys);

    return updatedKey;
  }

  /**
   * 删除密钥配置
   *
   * @param id 密钥 ID
   * @throws 如果密钥不存在
   */
  deleteKey(id: string): void {
    const index = this.keys.findIndex(k => k.id === id);
    if (index === -1) {
      throw new Error('notFound');
    }

    // 删除配置
    this.keys.splice(index, 1);
    saveKeys(this.keys);

    // 同步到 background
    syncKeysToBackground(this.keys);

    // 如果删除的是当前选中的密钥
    if (this.selectedKeyId === id) {
      // 如果还有其他密钥，选中第一个
      if (this.keys.length > 0) {
        this.selectedKeyId = this.keys[0].id;
        saveSelectedKeyId(this.selectedKeyId);
      } else {
        // 没有密钥了，清空选中状态
        this.selectedKeyId = null;
        saveSelectedKeyId(null);
      }
    }
  }

  /**
   * 获取选中的密钥配置
   *
   * @returns 选中的密钥配置，如果没有则返回 null
   */
  getSelectedKey(): BarkKeyConfig | null {
    if (!this.selectedKeyId) {
      return null;
    }
    return this.keys.find(k => k.id === this.selectedKeyId) || null;
  }

  /**
   * 设置选中的密钥
   *
   * @param id 密钥 ID
   * @throws 如果密钥不存在
   */
  setSelectedKey(id: string): void {
    const key = this.keys.find(k => k.id === id);
    if (!key) {
      throw new Error('notFound');
    }

    this.selectedKeyId = id;
    saveSelectedKeyId(id);
  }

  /**
   * 测试密钥配置
   *
   * @param id 密钥 ID
   * @returns 测试是否成功
   * @throws 如果密钥不存在
   */
  async testKey(id: string): Promise<boolean> {
    const key = this.keys.find(k => k.id === id);
    if (!key) {
      throw new Error('notFound');
    }

    try {
      const url = `${key.server}/${key.deviceKey}/Test/Configuration test`;
      const response = await fetch(url);
      const data = await response.json();
      return data.code === 200;
    } catch (e) {
      console.error('Failed to test Bark key:', e);
      return false;
    }
  }

  /**
   * 验证密钥是否重复
   *
   * @param deviceKey 设备密钥
   * @param excludeId 要排除的密钥 ID（用于编辑时）
   * @returns 是否重复
   */
  isDuplicateKey(deviceKey: string, excludeId?: string): boolean {
    return this.keys.some(k =>
      k.deviceKey === deviceKey.trim() && k.id !== excludeId
    );
  }
}
