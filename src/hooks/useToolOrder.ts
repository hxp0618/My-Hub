import { useState, useCallback, useEffect } from 'react';
import { ToolId, DEFAULT_TOOL_ORDER, getValidToolOrder } from '../types/tools';
import { getToolOrder, setToolOrder } from '../db/indexedDB';

export interface UseToolOrderReturn {
  toolOrder: ToolId[];
  setToolOrder: (order: ToolId[]) => void;
  resetToolOrder: () => void;
  moveItem: (fromIndex: number, toIndex: number) => void;
  isLoading: boolean;
}

// 自定义事件名称，用于同一页面内的组件通信
const TOOL_ORDER_CHANGE_EVENT = 'toolOrderChanged';

/**
 * 工具顺序管理 Hook
 * 提供工具顺序的读取、修改、重置和持久化功能
 */
export function useToolOrder(): UseToolOrderReturn {
  const [toolOrder, setToolOrderState] = useState<ToolId[]>([...DEFAULT_TOOL_ORDER]);
  const [isLoading, setIsLoading] = useState(true);

  // 从 IndexedDB 加载工具顺序
  useEffect(() => {
    let cancelled = false;

    const loadOrder = async () => {
      try {
        const order = await getToolOrder();
        if (!cancelled) {
          setToolOrderState(order);
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Failed to load tool order:', error);
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    loadOrder();

    return () => {
      cancelled = true;
    };
  }, []);

  // 监听自定义事件（同一页面内的组件通信）
  useEffect(() => {
    const handleToolOrderChange = (e: CustomEvent<ToolId[]>) => {
      setToolOrderState(e.detail);
    };

    window.addEventListener(TOOL_ORDER_CHANGE_EVENT, handleToolOrderChange as EventListener);
    
    return () => {
      window.removeEventListener(TOOL_ORDER_CHANGE_EVENT, handleToolOrderChange as EventListener);
    };
  }, []);

  // 保存工具顺序到 IndexedDB 并触发自定义事件
  const saveOrder = useCallback(async (order: ToolId[]) => {
    const validOrder = getValidToolOrder(order);
    setToolOrderState(validOrder);
    
    // 触发自定义事件，通知同一页面内的其他组件
    window.dispatchEvent(new CustomEvent(TOOL_ORDER_CHANGE_EVENT, { detail: validOrder }));
    
    try {
      await setToolOrder(validOrder);
    } catch (error) {
      console.error('Failed to save tool order:', error);
    }
  }, []);

  // 设置工具顺序
  const handleSetToolOrder = useCallback((order: ToolId[]) => {
    saveOrder(order);
  }, [saveOrder]);

  // 重置为默认顺序
  const resetToolOrder = useCallback(() => {
    saveOrder([...DEFAULT_TOOL_ORDER]);
  }, [saveOrder]);

  // 移动工具项
  const moveItem = useCallback((fromIndex: number, toIndex: number) => {
    setToolOrderState((prevOrder) => {
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
      
      // 异步保存，不阻塞 UI
      saveOrder(newOrder);
      
      return newOrder;
    });
  }, [saveOrder]);

  return {
    toolOrder,
    setToolOrder: handleSetToolOrder,
    resetToolOrder,
    moveItem,
    isLoading,
  };
}

/**
 * 移动数组元素的纯函数（用于测试）
 */
export function moveArrayItem<T>(array: T[], fromIndex: number, toIndex: number): T[] {
  if (
    fromIndex < 0 ||
    fromIndex >= array.length ||
    toIndex < 0 ||
    toIndex >= array.length ||
    fromIndex === toIndex
  ) {
    return array;
  }

  const newArray = [...array];
  const [movedItem] = newArray.splice(fromIndex, 1);
  newArray.splice(toIndex, 0, movedItem);
  
  return newArray;
}
