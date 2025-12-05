import { useState, useCallback, useEffect } from 'react';
import {
  MenuItemId,
  DEFAULT_MENU_ORDER,
  MENU_ORDER_STORAGE_KEY,
  getValidMenuOrder,
} from '../types/menu';

export interface UseMenuOrderReturn {
  menuOrder: MenuItemId[];
  setMenuOrder: (order: MenuItemId[]) => void;
  resetMenuOrder: () => void;
  moveItem: (fromIndex: number, toIndex: number) => void;
}

// 从 localStorage 读取菜单顺序
function loadMenuOrder(): MenuItemId[] {
  try {
    const stored = localStorage.getItem(MENU_ORDER_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return getValidMenuOrder(parsed);
    }
  } catch (error) {
    console.warn('Failed to load menu order from localStorage:', error);
  }
  return [...DEFAULT_MENU_ORDER];
}

// 自定义事件名称，用于同一页面内的组件通信
const MENU_ORDER_CHANGE_EVENT = 'menuOrderChanged';

// 保存菜单顺序到 localStorage 并触发自定义事件
function saveMenuOrder(order: MenuItemId[]): void {
  try {
    localStorage.setItem(MENU_ORDER_STORAGE_KEY, JSON.stringify(order));
    // 触发自定义事件，通知同一页面内的其他组件
    window.dispatchEvent(new CustomEvent(MENU_ORDER_CHANGE_EVENT, { detail: order }));
  } catch (error) {
    console.error('Failed to save menu order to localStorage:', error);
  }
}

export function useMenuOrder(): UseMenuOrderReturn {
  const [menuOrder, setMenuOrderState] = useState<MenuItemId[]>(loadMenuOrder);

  // 监听 storage 事件（跨标签页）和自定义事件（同一页面内）
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === MENU_ORDER_STORAGE_KEY) {
        const newOrder = loadMenuOrder();
        setMenuOrderState(newOrder);
      }
    };

    const handleMenuOrderChange = (e: CustomEvent<MenuItemId[]>) => {
      setMenuOrderState(e.detail);
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener(MENU_ORDER_CHANGE_EVENT, handleMenuOrderChange as EventListener);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener(MENU_ORDER_CHANGE_EVENT, handleMenuOrderChange as EventListener);
    };
  }, []);

  // 设置菜单顺序
  const setMenuOrder = useCallback((order: MenuItemId[]) => {
    const validOrder = getValidMenuOrder(order);
    setMenuOrderState(validOrder);
    saveMenuOrder(validOrder);
  }, []);

  // 重置为默认顺序
  const resetMenuOrder = useCallback(() => {
    const defaultOrder = [...DEFAULT_MENU_ORDER];
    setMenuOrderState(defaultOrder);
    saveMenuOrder(defaultOrder);
  }, []);

  // 移动菜单项
  const moveItem = useCallback((fromIndex: number, toIndex: number) => {
    setMenuOrderState((prevOrder) => {
      // 验证索引范围
      if (
        fromIndex < 0 ||
        fromIndex >= prevOrder.length ||
        toIndex < 0 ||
        toIndex >= prevOrder.length ||
        fromIndex === toIndex
      ) {
        return prevOrder;
      }

      const newOrder = [...prevOrder];
      const [movedItem] = newOrder.splice(fromIndex, 1);
      newOrder.splice(toIndex, 0, movedItem);
      
      saveMenuOrder(newOrder);
      return newOrder;
    });
  }, []);

  return {
    menuOrder,
    setMenuOrder,
    resetMenuOrder,
    moveItem,
  };
}
