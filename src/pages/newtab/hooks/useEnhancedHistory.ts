import { useEffect, useState, useCallback } from 'react';
import { HistoryItem, Device } from '../types';
import { startOfDay, format } from 'date-fns';

export function useEnhancedHistory() {
  const [allHistory, setAllHistory] = useState<HistoryItem[]>([]);
  const [filteredHistory, setFilteredHistory] = useState<HistoryItem[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState<{
    search: string;
    device: string;
    startTime: number;
    endTime: number;
  }>({
    search: '',
    device: 'all',
    startTime: 0, // Default to all time
    endTime: Date.now(),
  });
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 50;

  const fetchHistory = useCallback(async () => {
    if (!chrome.history) {
      console.error('Chrome History API not available');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      const currentDeviceName = 'Current Device';
      const deviceList: Device[] = [
        { id: 'all', name: 'All Devices', isCurrent: false },
        { id: currentDeviceName, name: `${currentDeviceName} (Current)`, isCurrent: true },
      ];
      setDevices(deviceList);

      const urlMap = new Map<string, HistoryItem>();
      const getFaviconUrl = (url: string) => `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=32}`;

      const processHistoryItems = (
        items: (
          | chrome.history.HistoryItem
          | { id: string; url: string; title: string; lastVisitTime: number; visitCount: number }
        )[],
        deviceName: string,
      ) => {
        items.forEach(item => {
          if (!item.url || item.url.startsWith('chrome://') || item.url.startsWith('chrome-extension://')) {
            return;
          }
          const key = item.url;
          if (urlMap.has(key)) {
            const existing = urlMap.get(key)!;
            existing.visitCount += item.visitCount || 1;
            if ((item.lastVisitTime || 0) > existing.lastVisitTime) {
              existing.lastVisitTime = item.lastVisitTime || 0;
              existing.deviceName = deviceName;
              existing.deviceId = deviceName;
            }
          } else {
            urlMap.set(key, {
              url: item.url!,
              title: item.title || item.url!,
              visitCount: item.visitCount || 1,
              lastVisitTime: item.lastVisitTime || 0,
              favicon: getFaviconUrl(item.url!),
              deviceId: deviceName,
              deviceName: deviceName,
            });
          }
        });
      };

      const localHistory = await chrome.history.search({
        text: '',
        startTime: filters.startTime,
        endTime: filters.endTime,
        maxResults: 10000,
      });
      processHistoryItems(localHistory, currentDeviceName);

      const processedHistory = Array.from(urlMap.values()).sort((a, b) => b.lastVisitTime - a.lastVisitTime);
      setAllHistory(processedHistory);
      if (filters.startTime === 0) {
        const dateKeys = new Set<string>();
        processedHistory.forEach(item => {
          if (item.lastVisitTime) {
            const dateKey = format(startOfDay(new Date(item.lastVisitTime)), 'yyyy-MM-dd');
            dateKeys.add(dateKey);
          }
        });
        setAvailableDates(Array.from(dateKeys).sort().reverse());
      }
    } catch (error) {
      console.error('Failed to fetch history items:', error);
      setAllHistory([]);
    } finally {
      setIsLoading(false);
    }
  }, [filters.device, filters.startTime, filters.endTime]);


  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);


  useEffect(() => {
    let filtered = [...allHistory];

    // Device filtering is now handled in fetchHistory, so this is redundant.
    // if (filters.device !== 'all') {
    //   filtered = filtered.filter(item => item.deviceId === filters.device);
    // }

    // 搜索改为纯前端过滤，避免输入时频繁触发 chrome.history.search
    if (filters.search.trim()) {
      const term = filters.search.toLowerCase();
      filtered = filtered.filter(item => item.title.toLowerCase().includes(term) || item.url.toLowerCase().includes(term));
    }


    setFilteredHistory(filtered);
    setCurrentPage(1);
  }, [filters, allHistory]);

  const loadMore = () => {
    setCurrentPage(prev => prev + 1);
  };

  const deleteHistoryByUrl = async (url: string) => {
    if (!chrome.history) return;
    try {
      await chrome.history.deleteUrl({ url });
      await fetchHistory(); // Refetch after deletion
    } catch (error) {
      console.error(`Error deleting history for url: ${url}`, error);
    }
  };

  const deleteHistoryByDateRange = async (startTime: number, endTime: number) => {
    if (!chrome.history) return;
    try {
      await chrome.history.deleteRange({ startTime, endTime });
      await fetchHistory(); // Refetch after deletion
    } catch (error) {
      console.error(`Error deleting history for range: ${startTime} - ${endTime}`, error);
    }
  };


  return {
    historyItems: filteredHistory.slice(0, currentPage * PAGE_SIZE),
    hasMore: filteredHistory.length > currentPage * PAGE_SIZE,
    loadMore,
    devices,
    isLoading,
    filters,
    setFilters,
    deleteHistoryByUrl,
    deleteHistoryByDateRange,
    availableDates,
  };
}
