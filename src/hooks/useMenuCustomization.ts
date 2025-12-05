import { useState, useCallback, useEffect } from 'react';
import {
  MenuItemId,
  MenuCustomization,
  MenuItemCustomization,
  MENU_CUSTOMIZATION_STORAGE_KEY,
  getValidMenuCustomization,
} from '../types/menu';

export interface UseMenuCustomizationReturn {
  customization: MenuCustomization;
  setItemIcon: (itemId: MenuItemId, icon: string | undefined) => void;
  resetCustomization: () => void;
  getItemIcon: (itemId: MenuItemId, defaultIcon: string) => string;
}

// 自定义事件名称
const MENU_CUSTOMIZATION_CHANGE_EVENT = 'menuCustomizationChanged';

// 从 localStorage 读取自定义配置
function loadCustomization(): MenuCustomization {
  try {
    const stored = localStorage.getItem(MENU_CUSTOMIZATION_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return getValidMenuCustomization(parsed);
    }
  } catch (error) {
    console.warn('Failed to load menu customization from localStorage:', error);
  }
  return {};
}

// 保存自定义配置到 localStorage 并触发事件
function saveCustomization(customization: MenuCustomization): void {
  try {
    localStorage.setItem(MENU_CUSTOMIZATION_STORAGE_KEY, JSON.stringify(customization));
    window.dispatchEvent(new CustomEvent(MENU_CUSTOMIZATION_CHANGE_EVENT, { detail: customization }));
  } catch (error) {
    console.error('Failed to save menu customization to localStorage:', error);
  }
}

export function useMenuCustomization(): UseMenuCustomizationReturn {
  const [customization, setCustomizationState] = useState<MenuCustomization>(loadCustomization);

  // 监听事件
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === MENU_CUSTOMIZATION_STORAGE_KEY) {
        setCustomizationState(loadCustomization());
      }
    };

    const handleCustomizationChange = (e: CustomEvent<MenuCustomization>) => {
      setCustomizationState(e.detail);
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener(MENU_CUSTOMIZATION_CHANGE_EVENT, handleCustomizationChange as EventListener);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener(MENU_CUSTOMIZATION_CHANGE_EVENT, handleCustomizationChange as EventListener);
    };
  }, []);

  // 设置单个菜单项的图标
  const setItemIcon = useCallback((itemId: MenuItemId, icon: string | undefined) => {
    setCustomizationState((prev) => {
      const newCustomization = { ...prev };
      
      // 如果图标为空，删除该项
      if (!icon) {
        delete newCustomization[itemId];
      } else {
        newCustomization[itemId] = { customIcon: icon };
      }
      
      saveCustomization(newCustomization);
      return newCustomization;
    });
  }, []);

  // 重置所有自定义配置
  const resetCustomization = useCallback(() => {
    setCustomizationState({});
    saveCustomization({});
  }, []);

  // 获取菜单项图标（优先使用自定义图标）
  const getItemIcon = useCallback((itemId: MenuItemId, defaultIcon: string): string => {
    return customization[itemId]?.customIcon || defaultIcon;
  }, [customization]);

  return {
    customization,
    setItemIcon,
    resetCustomization,
    getItemIcon,
  };
}
