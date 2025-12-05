import { useState, useCallback, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';

/**
 * 历史记录项
 */
export interface HistoryItem {
  /** 唯一标识 */
  id: string;
  /** 输入内容 */
  content: string;
  /** 保存时间戳 */
  timestamp: number;
}

/**
 * useInputHistory Hook 配置选项
 */
export interface UseInputHistoryOptions {
  /** 工具 ID，用于区分不同工具的历史记录 */
  toolId: string;
  /** 最大记录数，默认 20 */
  maxItems?: number;
}

/**
 * useInputHistory Hook 返回值
 */
export interface UseInputHistoryReturn {
  /** 历史记录列表 */
  history: HistoryItem[];
  /** 添加到历史记录 */
  addToHistory: (content: string) => void;
  /** 从历史记录中选择，返回内容 */
  selectFromHistory: (id: string) => string | undefined;
  /** 清空历史记录 */
  clearHistory: () => void;
  /** 删除单条历史记录 */
  removeFromHistory: (id: string) => void;
}

// localStorage key 前缀
const STORAGE_KEY_PREFIX = 'tool_history_';

/**
 * 从 localStorage 获取历史记录
 */
function getStoredHistory(toolId: string): HistoryItem[] {
  try {
    const key = `${STORAGE_KEY_PREFIX}${toolId}`;
    const stored = localStorage.getItem(key);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed to load history from localStorage:', e);
  }
  return [];
}

/**
 * 保存历史记录到 localStorage
 */
function saveHistory(toolId: string, items: HistoryItem[]): void {
  try {
    const key = `${STORAGE_KEY_PREFIX}${toolId}`;
    localStorage.setItem(key, JSON.stringify(items));
  } catch (e) {
    console.error('Failed to save history to localStorage:', e);
  }
}

/**
 * 输入历史记录 Hook
 * 
 * 提供历史记录的添加、删除、清空等功能，并自动持久化到 localStorage
 * 
 * @param options 配置选项
 * @returns Hook 返回值
 * 
 * @example
 * ```tsx
 * const { history, addToHistory, selectFromHistory, clearHistory } = useInputHistory({
 *   toolId: 'base64-converter',
 *   maxItems: 20,
 * });
 * ```
 */
export function useInputHistory(options: UseInputHistoryOptions): UseInputHistoryReturn {
  const { toolId, maxItems = 20 } = options;

  const [history, setHistory] = useState<HistoryItem[]>(() => getStoredHistory(toolId));

  // 当 toolId 变化时重新加载历史记录
  useEffect(() => {
    setHistory(getStoredHistory(toolId));
  }, [toolId]);

  // 添加到历史记录
  const addToHistory = useCallback((content: string) => {
    if (!content.trim()) return;

    setHistory(prev => {
      // 检查是否已存在相同内容
      const existingIndex = prev.findIndex(item => item.content === content);
      
      let newHistory: HistoryItem[];
      
      if (existingIndex !== -1) {
        // 如果已存在，移到最前面并更新时间戳
        const existing = prev[existingIndex];
        const updated = { ...existing, timestamp: Date.now() };
        newHistory = [updated, ...prev.filter((_, i) => i !== existingIndex)];
      } else {
        // 添加新记录
        const newItem: HistoryItem = {
          id: uuidv4(),
          content,
          timestamp: Date.now(),
        };
        newHistory = [newItem, ...prev];
      }

      // 限制数量
      if (newHistory.length > maxItems) {
        newHistory = newHistory.slice(0, maxItems);
      }

      // 保存到 localStorage
      saveHistory(toolId, newHistory);

      return newHistory;
    });
  }, [toolId, maxItems]);

  // 从历史记录中选择
  const selectFromHistory = useCallback((id: string): string | undefined => {
    const item = history.find(h => h.id === id);
    return item?.content;
  }, [history]);

  // 清空历史记录
  const clearHistory = useCallback(() => {
    setHistory([]);
    saveHistory(toolId, []);
  }, [toolId]);

  // 删除单条历史记录
  const removeFromHistory = useCallback((id: string) => {
    setHistory(prev => {
      const newHistory = prev.filter(item => item.id !== id);
      saveHistory(toolId, newHistory);
      return newHistory;
    });
  }, [toolId]);

  return {
    history,
    addToHistory,
    selectFromHistory,
    clearHistory,
    removeFromHistory,
  };
}

export default useInputHistory;
