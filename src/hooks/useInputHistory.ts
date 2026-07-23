import { useState, useCallback, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { createLogger } from '../utils/logger';

const logger = createLogger('[useInputHistory]');

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
  /** 最近一次处理输出 */
  output?: string;
  /** 处理模式 */
  mode?: string;
  /** 固定在历史顶部 */
  pinned?: boolean;
}

export interface HistoryItemMetadata {
  output?: string;
  mode?: string;
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
  addToHistory: (content: string, metadata?: HistoryItemMetadata) => void;
  /** 从历史记录中选择，返回内容 */
  selectFromHistory: (id: string) => string | undefined;
  /** 清空历史记录 */
  clearHistory: () => void;
  /** 删除单条历史记录 */
  removeFromHistory: (id: string) => void;
  /** 固定或取消固定记录 */
  togglePinned: (id: string) => void;
}

// localStorage key 前缀
const STORAGE_KEY_PREFIX = 'tool_history_';
const MAX_VALID_DATE_MS = 8_640_000_000_000_000;

const isRecord = (value: unknown): value is Record<string, unknown> => (
  !!value && typeof value === 'object' && !Array.isArray(value)
);

const isValidHistoryTimestamp = (value: unknown): value is number => {
  if (typeof value !== 'number' || !Number.isSafeInteger(value)) {
    return false;
  }

  // Date accepts finite numbers beyond its valid range and then renders "Invalid Date".
  return Math.abs(value) <= MAX_VALID_DATE_MS && !Number.isNaN(new Date(value).getTime());
};

export function sanitizeInputHistoryItems(value: unknown, maxItems = 20): HistoryItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const limit = Number.isInteger(maxItems) && maxItems > 0 ? maxItems : 20;
  const seenIds = new Set<string>();
  const sanitized: HistoryItem[] = [];

  for (const item of value) {
    if (!isRecord(item)) {
      continue;
    }

    const { id, content, timestamp, output, mode, pinned } = item;
    if (
      typeof id !== 'string' ||
      id.trim().length === 0 ||
      seenIds.has(id) ||
      typeof content !== 'string' ||
      content.trim().length === 0 ||
      !isValidHistoryTimestamp(timestamp)
    ) {
      continue;
    }

    sanitized.push({
      id,
      content,
      timestamp,
      ...(typeof output === 'string' && output.trim() ? { output } : {}),
      ...(typeof mode === 'string' && mode.trim() ? { mode } : {}),
      ...(pinned === true ? { pinned: true } : {}),
    });
    seenIds.add(id);

    if (sanitized.length >= limit) {
      break;
    }
  }

  return sanitized;
}

/**
 * 从 localStorage 获取历史记录
 */
function getStoredHistory(toolId: string, maxItems: number): HistoryItem[] {
  try {
    const key = `${STORAGE_KEY_PREFIX}${toolId}`;
    const stored = localStorage.getItem(key);
    if (stored) {
      const parsed: unknown = JSON.parse(stored);
      return sanitizeInputHistoryItems(parsed, maxItems);
    }
  } catch (error) {
    logger.error('Failed to load history from localStorage', error);
  }
  return [];
}

/**
 * 保存历史记录到 localStorage
 */
function saveHistory(toolId: string, items: HistoryItem[]): void {
  try {
    const key = `${STORAGE_KEY_PREFIX}${toolId}`;
    localStorage.setItem(key, JSON.stringify(sanitizeInputHistoryItems(items, items.length)));
  } catch (error) {
    logger.error('Failed to save history to localStorage', error);
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

  const [history, setHistory] = useState<HistoryItem[]>(() => getStoredHistory(toolId, maxItems));

  // 当 toolId 变化时重新加载历史记录
  useEffect(() => {
    setHistory(getStoredHistory(toolId, maxItems));
  }, [toolId, maxItems]);

  // 添加到历史记录
  const addToHistory = useCallback((content: string, metadata: HistoryItemMetadata = {}) => {
    if (!content.trim()) return;

    setHistory(prev => {
      // 检查是否已存在相同内容
      const existingIndex = prev.findIndex(item => item.content === content);
      
      let newHistory: HistoryItem[];
      
      if (existingIndex !== -1) {
        // 如果已存在，移到最前面并更新时间戳
        const existing = prev[existingIndex];
        const updated: HistoryItem = {
          ...existing,
          timestamp: Date.now(),
          ...(metadata.output?.trim() ? { output: metadata.output } : {}),
          ...(metadata.mode?.trim() ? { mode: metadata.mode } : {}),
        };
        const remaining = prev.filter((_, i) => i !== existingIndex);
        newHistory = updated.pinned
          ? [updated, ...remaining]
          : [...remaining.filter(item => item.pinned), updated, ...remaining.filter(item => !item.pinned)];
      } else {
        // 添加新记录
        const newItem: HistoryItem = {
          id: uuidv4(),
          content,
          timestamp: Date.now(),
          ...(metadata.output?.trim() ? { output: metadata.output } : {}),
          ...(metadata.mode?.trim() ? { mode: metadata.mode } : {}),
        };
        newHistory = [...prev.filter(item => item.pinned), newItem, ...prev.filter(item => !item.pinned)];
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

  const togglePinned = useCallback((id: string) => {
    setHistory(prev => {
      const next = prev.map(item => item.id === id ? { ...item, pinned: !item.pinned } : item);
      const sorted = [...next.filter(item => item.pinned), ...next.filter(item => !item.pinned)];
      saveHistory(toolId, sorted);
      return sorted;
    });
  }, [toolId]);

  return {
    history,
    addToHistory,
    selectFromHistory,
    clearHistory,
    removeFromHistory,
    togglePinned,
  };
}

export default useInputHistory;
