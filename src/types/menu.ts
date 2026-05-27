/**
 * 菜单类型定义和常量
 * 用于侧边栏菜单的自定义排序功能
 */
import { createLogger } from '../utils/logger';

const logger = createLogger('[menuTypes]');

// 菜单项类型
export type MenuItemId = 'home' | 'bookmarks' | 'tags' | 'history' | 'tools' | 'subscriptions';

// 菜单项配置
export interface MenuItem {
  id: MenuItemId;
  icon: string;
  labelKey: string; // i18n key
}

// 默认菜单顺序
export const DEFAULT_MENU_ORDER: MenuItemId[] = ['home', 'bookmarks', 'tags', 'history', 'subscriptions', 'tools'];

// 菜单项配置映射
export const MENU_ITEMS: Record<MenuItemId, MenuItem> = {
  home: { id: 'home', icon: 'home', labelKey: 'sidebar.home' },
  bookmarks: { id: 'bookmarks', icon: 'bookmark', labelKey: 'sidebar.bookmarks' },
  tags: { id: 'tags', icon: 'label', labelKey: 'sidebar.tags' },
  history: { id: 'history', icon: 'history', labelKey: 'sidebar.history' },
  subscriptions: { id: 'subscriptions', icon: 'subscriptions', labelKey: 'sidebar.subscriptions' },
  tools: { id: 'tools', icon: 'construction', labelKey: 'sidebar.tools' },
};

// localStorage 存储键名
export const MENU_ORDER_STORAGE_KEY = 'menuOrder';
export const MENU_CUSTOMIZATION_STORAGE_KEY = 'menuCustomization';

// 单个菜单项的自定义配置
export interface MenuItemCustomization {
  customIcon?: string; // 自定义图标，为空时使用默认图标
}

// 所有菜单项的自定义配置
export type MenuCustomization = Partial<Record<MenuItemId, MenuItemCustomization>>;

// 常用图标列表，供用户选择
export const AVAILABLE_ICONS: string[] = [
  'home', 'bookmark', 'label', 'history', 'construction',
  'star', 'favorite', 'folder', 'description', 'article',
  'dashboard', 'explore', 'search', 'settings', 'apps',
  'category', 'inventory_2', 'work', 'school', 'code',
  'terminal', 'bug_report', 'science', 'psychology', 'lightbulb',
  'rocket_launch', 'speed', 'timer', 'calendar_today', 'schedule',
];

const isRecord = (value: unknown): value is Record<string, unknown> => (
  !!value && typeof value === 'object' && !Array.isArray(value)
);

// 验证菜单顺序是否有效
export function isValidMenuOrder(order: unknown): order is MenuItemId[] {
  if (!Array.isArray(order)) {
    return false;
  }
  
  if (order.length !== DEFAULT_MENU_ORDER.length) {
    return false;
  }
  
  const validIds = new Set(DEFAULT_MENU_ORDER);
  const seenIds = new Set<string>();
  
  for (const id of order) {
    if (typeof id !== 'string' || !validIds.has(id as MenuItemId)) {
      return false;
    }
    if (seenIds.has(id)) {
      return false; // 重复项
    }
    seenIds.add(id);
  }
  
  return true;
}

// 获取有效的菜单顺序，无效时返回默认顺序
export function getValidMenuOrder(order: unknown): MenuItemId[] {
  if (isValidMenuOrder(order)) {
    return order;
  }
  logger.warn('Invalid menu order data, using default order');
  return [...DEFAULT_MENU_ORDER];
}


// 验证菜单自定义配置是否有效
export function isValidMenuCustomization(customization: unknown): customization is MenuCustomization {
  if (!isRecord(customization)) {
    return false;
  }
  
  const validIds = new Set(DEFAULT_MENU_ORDER);
  
  for (const [key, value] of Object.entries(customization)) {
    if (!validIds.has(key as MenuItemId)) {
      return false;
    }
    if (!isRecord(value)) {
      return false;
    }
    if (value.customIcon !== undefined && (typeof value.customIcon !== 'string' || value.customIcon.trim().length === 0)) {
      return false;
    }
  }
  
  return true;
}

// 清洗菜单自定义配置，保留合法项并丢弃损坏条目
export function sanitizeMenuCustomization(customization: unknown): MenuCustomization {
  if (!isRecord(customization)) {
    return {};
  }

  const validIds = new Set(DEFAULT_MENU_ORDER);
  const sanitized: MenuCustomization = {};

  for (const [key, value] of Object.entries(customization)) {
    if (!validIds.has(key as MenuItemId) || !isRecord(value)) {
      continue;
    }

    if (value.customIcon === undefined) {
      sanitized[key as MenuItemId] = {};
      continue;
    }

    if (typeof value.customIcon !== 'string') {
      continue;
    }

    const customIcon = value.customIcon.trim();
    if (customIcon) {
      sanitized[key as MenuItemId] = { customIcon };
    }
  }

  return sanitized;
}

// 获取有效的菜单自定义配置，无效时返回空对象
export function getValidMenuCustomization(customization: unknown): MenuCustomization {
  const sanitized = sanitizeMenuCustomization(customization);
  if (!isValidMenuCustomization(customization)) {
    logger.warn('Invalid menu customization data, using sanitized customization');
  }
  return sanitized;
}
