/**
 * HTTP 请求历史记录管理 Hook
 * 提供历史记录的增删改查功能
 */

import { useState, useEffect, useCallback } from 'react';
import { HistoryEntry, RequestState, HttpMethod, HeaderEntry } from '../types/http';
import {
  getHttpHistory,
  addHttpHistoryEntry,
  removeHttpHistoryEntry,
  clearHttpHistory,
} from '../db/indexedDB';
import { generateId } from '../utils/httpUtils';

const MAX_HISTORY_ENTRIES = 10;

export interface UseHttpHistoryReturn {
  /** 历史记录列表 */
  history: HistoryEntry[];
  /** 是否正在加载 */
  loading: boolean;
  /** 添加历史记录 */
  addEntry: (
    request: {
      url: string;
      method: HttpMethod;
      headers: HeaderEntry[];
      body: string;
    },
    response?: {
      status: number;
      statusText: string;
      time: number;
    }
  ) => Promise<HistoryEntry>;
  /** 删除历史记录 */
  removeEntry: (id: string) => Promise<void>;
  /** 清空所有历史记录 */
  clearAll: () => Promise<void>;
  /** 恢复历史记录到请求状态 */
  restoreEntry: (id: string) => RequestState | null;
  /** 刷新历史记录 */
  refresh: () => Promise<void>;
}

/**
 * HTTP 请求历史记录管理 Hook
 */
export function useHttpHistory(): UseHttpHistoryReturn {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // 加载历史记录
  const loadHistory = useCallback(async () => {
    try {
      setLoading(true);
      const entries = await getHttpHistory();
      // 只保留最近的 MAX_HISTORY_ENTRIES 条
      setHistory(entries.slice(0, MAX_HISTORY_ENTRIES));
    } catch (error) {
      console.error('Failed to load HTTP history:', error);
      setHistory([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // 初始化加载
  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // 添加历史记录
  const addEntry = useCallback(
    async (
      request: {
        url: string;
        method: HttpMethod;
        headers: HeaderEntry[];
        body: string;
      },
      response?: {
        status: number;
        statusText: string;
        time: number;
      }
    ): Promise<HistoryEntry> => {
      const entry: HistoryEntry = {
        id: generateId(),
        timestamp: Date.now(),
        request,
        response,
      };

      try {
        await addHttpHistoryEntry(entry);
        // 更新本地状态
        setHistory((prev) => {
          const newHistory = [entry, ...prev];
          // 保持最大数量限制
          return newHistory.slice(0, MAX_HISTORY_ENTRIES);
        });
      } catch (error) {
        console.error('Failed to add HTTP history entry:', error);
      }

      return entry;
    },
    []
  );

  // 删除历史记录
  const removeEntry = useCallback(async (id: string): Promise<void> => {
    try {
      await removeHttpHistoryEntry(id);
      setHistory((prev) => prev.filter((entry) => entry.id !== id));
    } catch (error) {
      console.error('Failed to remove HTTP history entry:', error);
    }
  }, []);

  // 清空所有历史记录
  const clearAll = useCallback(async (): Promise<void> => {
    try {
      await clearHttpHistory();
      setHistory([]);
    } catch (error) {
      console.error('Failed to clear HTTP history:', error);
    }
  }, []);

  // 恢复历史记录到请求状态
  const restoreEntry = useCallback(
    (id: string): RequestState | null => {
      const entry = history.find((e) => e.id === id);
      if (!entry) {
        return null;
      }

      return {
        url: entry.request.url,
        method: entry.request.method,
        headers: entry.request.headers,
        body: entry.request.body,
      };
    },
    [history]
  );

  // 刷新历史记录
  const refresh = useCallback(async (): Promise<void> => {
    await loadHistory();
  }, [loadHistory]);

  return {
    history,
    loading,
    addEntry,
    removeEntry,
    clearAll,
    restoreEntry,
    refresh,
  };
}

// ==================== 纯函数用于测试 ====================

/**
 * 限制历史记录数量
 * 保留最近的 maxEntries 条记录
 */
export function limitHistoryEntries(
  entries: HistoryEntry[],
  maxEntries: number = MAX_HISTORY_ENTRIES
): HistoryEntry[] {
  // 按时间戳降序排列
  const sorted = [...entries].sort((a, b) => b.timestamp - a.timestamp);
  return sorted.slice(0, maxEntries);
}

/**
 * 添加历史记录条目（纯函数版本）
 * 返回新的历史记录数组
 */
export function addHistoryEntry(
  entries: HistoryEntry[],
  newEntry: HistoryEntry,
  maxEntries: number = MAX_HISTORY_ENTRIES
): HistoryEntry[] {
  const newHistory = [newEntry, ...entries];
  return limitHistoryEntries(newHistory, maxEntries);
}

/**
 * 删除历史记录条目（纯函数版本）
 * 返回新的历史记录数组
 */
export function removeHistoryEntry(
  entries: HistoryEntry[],
  id: string
): HistoryEntry[] {
  return entries.filter((entry) => entry.id !== id);
}

/**
 * 清空历史记录（纯函数版本）
 * 返回空数组
 */
export function clearHistoryEntries(): HistoryEntry[] {
  return [];
}

/**
 * 恢复历史记录到请求状态（纯函数版本）
 */
export function restoreHistoryEntry(
  entries: HistoryEntry[],
  id: string
): RequestState | null {
  const entry = entries.find((e) => e.id === id);
  if (!entry) {
    return null;
  }

  return {
    url: entry.request.url,
    method: entry.request.method,
    headers: entry.request.headers,
    body: entry.request.body,
  };
}
