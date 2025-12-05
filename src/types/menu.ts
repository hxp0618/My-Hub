/**
 * 菜单类型定义和常量
 * 用于侧边栏菜单的自定义排序功能
 */

// 菜单项类型
export type MenuItemId = 'home' | 'bookmarks' | 'tags' | 'history' | 'tools';

// 菜单项配置
export interface MenuItem {
  id: MenuItemId;
  icon: string;
  labelKey: string; // i18n key
}

// 默认菜单顺序
export const DEFAULT_MENU_ORDER: MenuItemId[] = ['home', 'bookmarks', 'tags', 'history', 'tools'];

// 菜单项配置映射
export const MENU_ITEMS: Record<MenuItemId, MenuItem> = {
  home: { id: 'home', icon: 'home', labelKey: 'sidebar.home' },
  bookmarks: { id: 'bookmarks', icon: 'bookmark', labelKey: 'sidebar.bookmarks' },
  tags: { id: 'tags', icon: 'label', labelKey: 'sidebar.tags' },
  history: { id: 'history', icon: 'history', labelKey: 'sidebar.history' },
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
  console.warn('Invalid menu order data, using default order');
  return [...DEFAULT_MENU_ORDER];
}


// 验证菜单自定义配置是否有效
export function isValidMenuCustomization(customization: unknown): customization is MenuCustomization {
  if (typeof customization !== 'object' || customization === null) {
    return false;
  }
  
  const validIds = new Set(DEFAULT_MENU_ORDER);
  
  for (const [key, value] of Object.entries(customization)) {
    if (!validIds.has(key as MenuItemId)) {
      return false;
    }
    if (typeof value !== 'object' || value === null) {
      return false;
    }
    const item = value as MenuItemCustomization;
    if (item.customIcon !== undefined && typeof item.customIcon !== 'string') {
      return false;
    }
  }
  
  return true;
}

// 获取有效的菜单自定义配置，无效时返回空对象
export function getValidMenuCustomization(customization: unknown): MenuCustomization {
  if (isValidMenuCustomization(customization)) {
    return customization;
  }
  console.warn('Invalid menu customization data, using empty customization');
  return {};
}
