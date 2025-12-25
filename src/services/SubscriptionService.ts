/**
 * 订阅管理服务
 * 提供订阅数据的 CRUD 操作、状态计算、续订逻辑等核心功能
 */
import {
  Subscription,
  SubscriptionCycle,
  SubscriptionStatus,
  SubscriptionError,
  SubscriptionErrorCode,
  CreateSubscriptionParams,
  UpdateSubscriptionParams,
  generateSubscriptionId,
} from '../types/subscription';
import {
  getAllSubscriptions as dbGetAll,
  getSubscriptionById as dbGetById,
  addSubscription as dbAdd,
  updateSubscription as dbUpdate,
  deleteSubscription as dbDelete,
  clearAllSubscriptions as dbClearAll,
  batchAddSubscriptions as dbBatchAdd,
} from '../db/indexedDB';

/**
 * 验证订阅名称是否有效
 * 名称不能为空或仅包含空白字符
 */
export function validateSubscriptionName(name: string): boolean {
  return name.trim().length > 0;
}

/**
 * 计算剩余天数（按日期计算，不考虑时间）
 * 返回到期日期与当前日期之间的天数差
 * 正数表示还有多少天到期，负数表示已过期多少天，0表示今天到期
 */
export function getRemainingDays(expiryDate: number, currentDate: number = Date.now()): number {
  // 将时间戳转换为日期（只保留年月日）
  const expiryDay = new Date(expiryDate);
  expiryDay.setHours(0, 0, 0, 0);
  
  const currentDay = new Date(currentDate);
  currentDay.setHours(0, 0, 0, 0);
  
  const msPerDay = 24 * 60 * 60 * 1000;
  const diffMs = expiryDay.getTime() - currentDay.getTime();
  return Math.round(diffMs / msPerDay);
}

/**
 * 计算订阅状态
 * - 如果 isEnabled 为 false，返回 'disabled'
 * - 如果到期日期早于当前日期，返回 'expired'
 * - 否则返回 'active'
 */
export function calculateStatus(subscription: Subscription, currentDate: number = Date.now()): SubscriptionStatus {
  if (!subscription.isEnabled) {
    return 'disabled';
  }
  if (subscription.expiryDate < currentDate) {
    return 'expired';
  }
  return 'active';
}

/**
 * 判断订阅是否即将到期
 * 当剩余天数小于等于提醒天数且订阅已启用时返回 true
 */
export function isExpiringSoon(subscription: Subscription, currentDate: number = Date.now()): boolean {
  if (!subscription.isEnabled) {
    return false;
  }
  const remainingDays = getRemainingDays(subscription.expiryDate, currentDate);
  return remainingDays >= 0 && remainingDays <= subscription.reminderDays;
}


/**
 * 判断订阅是否需要提醒
 * 只有启用状态且即将到期的订阅才需要提醒
 */
export function shouldRemind(subscription: Subscription, currentDate: number = Date.now()): boolean {
  if (!subscription.isEnabled) {
    return false;
  }
  return isExpiringSoon(subscription, currentDate);
}

/**
 * 根据周期计算下一个到期日期
 * @param currentExpiryDate 当前到期日期时间戳
 * @param cycle 订阅周期
 * @returns 下一个到期日期时间戳
 */
export function calculateNextExpiryDate(currentExpiryDate: number, cycle: SubscriptionCycle): number {
  const date = new Date(currentExpiryDate);
  
  switch (cycle) {
    case 'monthly':
      date.setMonth(date.getMonth() + 1);
      break;
    case 'quarterly':
      date.setMonth(date.getMonth() + 3);
      break;
    case 'semi-annual':
      date.setMonth(date.getMonth() + 6);
      break;
    case 'annual':
      date.setFullYear(date.getFullYear() + 1);
      break;
    case 'one-time':
      // 一次性订阅不支持续订，返回原日期
      return currentExpiryDate;
  }
  
  return date.getTime();
}

/**
 * 订阅排序比较函数
 * 排序规则：过期 > 即将到期 > 正常，同类按到期日期升序
 */
export function compareSubscriptions(a: Subscription, b: Subscription, currentDate: number = Date.now()): number {
  const aStatus = calculateStatus(a, currentDate);
  const bStatus = calculateStatus(b, currentDate);
  const aExpiringSoon = isExpiringSoon(a, currentDate);
  const bExpiringSoon = isExpiringSoon(b, currentDate);
  
  // 优先级：expired > expiring soon > active/disabled
  const getPriority = (status: SubscriptionStatus, expiringSoon: boolean): number => {
    if (status === 'expired') return 0;
    if (expiringSoon) return 1;
    return 2;
  };
  
  const aPriority = getPriority(aStatus, aExpiringSoon);
  const bPriority = getPriority(bStatus, bExpiringSoon);
  
  if (aPriority !== bPriority) {
    return aPriority - bPriority;
  }
  
  // 同优先级按到期日期升序
  return a.expiryDate - b.expiryDate;
}

// ==================== 服务类 ====================

class SubscriptionService {
  /**
   * 获取所有订阅
   */
  async getAllSubscriptions(): Promise<Subscription[]> {
    return dbGetAll();
  }

  /**
   * 根据 ID 获取订阅
   */
  async getSubscription(id: string): Promise<Subscription | null> {
    return dbGetById(id);
  }

  /**
   * 创建订阅
   * @throws SubscriptionError 如果名称无效
   */
  async createSubscription(params: CreateSubscriptionParams): Promise<Subscription> {
    // 验证名称
    if (!validateSubscriptionName(params.name)) {
      throw new SubscriptionError(
        SubscriptionErrorCode.INVALID_NAME,
        '订阅名称不能为空'
      );
    }

    const now = Date.now();
    const subscription: Subscription = {
      ...params,
      id: generateSubscriptionId(),
      status: calculateStatus({ ...params, id: '', status: 'active', createdAt: now, updatedAt: now } as Subscription, now),
      createdAt: now,
      updatedAt: now,
    };

    return dbAdd(subscription);
  }

  /**
   * 更新订阅
   * @throws SubscriptionError 如果订阅不存在或名称无效
   */
  async updateSubscription(id: string, params: UpdateSubscriptionParams): Promise<Subscription> {
    const existing = await dbGetById(id);
    if (!existing) {
      throw new SubscriptionError(
        SubscriptionErrorCode.NOT_FOUND,
        '订阅不存在'
      );
    }

    // 如果更新名称，验证新名称
    if (params.name !== undefined && !validateSubscriptionName(params.name)) {
      throw new SubscriptionError(
        SubscriptionErrorCode.INVALID_NAME,
        '订阅名称不能为空'
      );
    }

    const now = Date.now();
    const updated: Subscription = {
      ...existing,
      ...params,
      updatedAt: now,
    };

    // 重新计算状态
    updated.status = calculateStatus(updated, now);

    return dbUpdate(updated);
  }

  /**
   * 删除订阅
   */
  async deleteSubscription(id: string): Promise<void> {
    return dbDelete(id);
  }

  /**
   * 续订订阅
   * @throws SubscriptionError 如果订阅不存在或是一次性订阅
   */
  async renewSubscription(id: string): Promise<Subscription> {
    const existing = await dbGetById(id);
    if (!existing) {
      throw new SubscriptionError(
        SubscriptionErrorCode.NOT_FOUND,
        '订阅不存在'
      );
    }

    if (existing.cycle === 'one-time') {
      throw new SubscriptionError(
        SubscriptionErrorCode.INVALID_DATE,
        '一次性订阅不支持续订'
      );
    }

    const newExpiryDate = calculateNextExpiryDate(existing.expiryDate, existing.cycle);
    return this.updateSubscription(id, { expiryDate: newExpiryDate });
  }

  /**
   * 获取排序后的订阅列表
   * 排序规则：过期 > 即将到期 > 正常，同类按到期日期升序
   */
  async getSortedSubscriptions(): Promise<Subscription[]> {
    const subscriptions = await dbGetAll();
    const now = Date.now();
    return subscriptions.sort((a, b) => compareSubscriptions(a, b, now));
  }

  /**
   * 切换订阅启用状态
   */
  async toggleEnabled(id: string): Promise<Subscription> {
    const existing = await dbGetById(id);
    if (!existing) {
      throw new SubscriptionError(
        SubscriptionErrorCode.NOT_FOUND,
        '订阅不存在'
      );
    }

    return this.updateSubscription(id, { isEnabled: !existing.isEnabled });
  }

  /**
   * 获取需要提醒的订阅列表
   */
  async getSubscriptionsNeedingReminder(): Promise<Subscription[]> {
    const subscriptions = await dbGetAll();
    const now = Date.now();
    return subscriptions.filter(s => shouldRemind(s, now));
  }

  /**
   * 清空所有订阅
   */
  async clearAll(): Promise<void> {
    return dbClearAll();
  }

  /**
   * 批量添加订阅
   */
  async batchAdd(subscriptions: Subscription[]): Promise<void> {
    return dbBatchAdd(subscriptions);
  }
}

// 导出单例
export const subscriptionService = new SubscriptionService();
export default subscriptionService;
