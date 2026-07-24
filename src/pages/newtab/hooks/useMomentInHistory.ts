import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { RecommendationItem } from '../types';
import { getFaviconUrl } from '../../../utils/favicon';
import { createLogger } from '../../../utils/logger';
import { getBookmarkSnapshot } from '../../../utils/bookmarkSnapshot';

const logger = createLogger('[useMomentInHistory]');
const HISTORY_CACHE_KEY = 'moment-in-history-cache-v1';
const HISTORY_CACHE_TTL_MS = 10 * 60 * 1000;
const TIME_WINDOW_HOURS = 1;
const DAYS_TO_SEARCH = 14;
const NORMAL_WEBSITE_THRESHOLD = 2;
const BOOKMARKED_WEBSITE_THRESHOLD = 1;

interface MomentHistoryCache {
  hourKey: string;
  cachedAt: number;
  recommendations: RecommendationItem[];
}

const getHourKey = (date: Date): string => (
  [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
    String(date.getHours()).padStart(2, '0'),
  ].join('-')
);

const readCachedRecommendations = (hourKey: string): RecommendationItem[] | null => {
  try {
    const raw = localStorage.getItem(HISTORY_CACHE_KEY);
    if (!raw) return null;
    const cache = JSON.parse(raw) as MomentHistoryCache;
    if (
      cache.hourKey !== hourKey ||
      !Array.isArray(cache.recommendations) ||
      Date.now() - cache.cachedAt >= HISTORY_CACHE_TTL_MS
    ) {
      return null;
    }
    return cache.recommendations;
  } catch {
    return null;
  }
};

const writeCachedRecommendations = (hourKey: string, recommendations: RecommendationItem[]) => {
  try {
    const cache: MomentHistoryCache = {
      hourKey,
      cachedAt: Date.now(),
      recommendations,
    };
    localStorage.setItem(HISTORY_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // 缓存不可用时继续使用实时查询结果。
  }
};

const clearCachedRecommendations = () => {
  try {
    localStorage.removeItem(HISTORY_CACHE_KEY);
  } catch {
    // 忽略禁用存储或容量异常。
  }
};

export function useMomentInHistory() {
  const { t } = useTranslation();
  const [recommendations, setRecommendations] = useState<RecommendationItem[]>([]);
  const [timeRange, setTimeRange] = useState('');

  const getRecommendations = useCallback(async (force = false) => {
    if (typeof chrome === 'undefined' || typeof chrome.history?.search !== 'function') {
      logger.error(
        'Chrome History API is not available. Please ensure the extension is loaded correctly and has the "history" permission.',
      );
      return;
    }

    const now = new Date();
    const currentHour = now.getHours();
    const timeWindowStart = Math.max(0, currentHour - TIME_WINDOW_HOURS);
    const timeWindowEnd = Math.min(23, currentHour + TIME_WINDOW_HOURS);

    setTimeRange(t('home.timeRangeFormat', { start: timeWindowStart, end: timeWindowEnd + 1 }));

    const hourKey = getHourKey(now);
    if (!force) {
      const cachedRecommendations = readCachedRecommendations(hourKey);
      if (cachedRecommendations) {
        setRecommendations(cachedRecommendations);
        return;
      }
    }

    try {
      const { urls: bookmarkUrls, bookmarkMap } = await getBookmarkSnapshot(force);

      const timeWindows: { start: number; end: number }[] = [];

      for (let dayOffset = 0; dayOffset < DAYS_TO_SEARCH; dayOffset++) {
        const targetDate = new Date(now);
        targetDate.setDate(now.getDate() - dayOffset);

        const startTime = new Date(targetDate);
        startTime.setHours(timeWindowStart, 0, 0, 0);

        const endTime = new Date(targetDate);
        endTime.setHours(timeWindowEnd, 59, 59, 999);

        timeWindows.push({ start: startTime.getTime(), end: endTime.getTime() });
      }

      const MAX_CONCURRENCY = 3;
      const allItems: chrome.history.HistoryItem[] = [];

      for (let i = 0; i < timeWindows.length; i += MAX_CONCURRENCY) {
        const batch = timeWindows.slice(i, i + MAX_CONCURRENCY);
        const batchResults = await Promise.all(
          batch.map(window =>
            chrome.history.search({
              text: '',
              startTime: window.start,
              endTime: window.end,
              maxResults: 10000,
            })
          )
        );
        batchResults.forEach(items => {
          allItems.push(...items);
        });
      }

      const processRecommendations = (
        historyItems: chrome.history.HistoryItem[],
        bookmarks: Set<string>,
        bookmarkMap: Map<string, { id: string; tags: string[] }>,
      ): RecommendationItem[] => {
        const urlMap = new Map<
          string,
          {
            url: string;
            title: string;
            favicon: string;
            lastVisitTime: number;
            visitedDays: Set<string>;
          }
        >();

        historyItems.forEach(item => {
          if (!item.url || item.url.startsWith('chrome://') || item.url.startsWith('chrome-extension://')) {
            return;
          }

          const visitDate = new Date(item.lastVisitTime || 0).toDateString();
          const key = item.url;

          if (!urlMap.has(key)) {
            urlMap.set(key, {
              url: item.url,
              title: item.title || item.url,
              favicon: getFaviconUrl(item.url),
              lastVisitTime: item.lastVisitTime || 0,
              visitedDays: new Set([visitDate]),
            });
          } else {
            const existing = urlMap.get(key)!;
            if ((item.lastVisitTime || 0) > existing.lastVisitTime) {
              existing.lastVisitTime = item.lastVisitTime || 0;
              existing.title = item.title || item.url;
            }
            existing.visitedDays.add(visitDate);
          }
        });

        const recommendations: RecommendationItem[] = [];
        urlMap.forEach(item => {
          const isBookmarked = bookmarks.has(item.url);
          const visitedDaysCount = item.visitedDays.size;

          if (
            (isBookmarked && visitedDaysCount >= BOOKMARKED_WEBSITE_THRESHOLD) ||
            (!isBookmarked && visitedDaysCount >= NORMAL_WEBSITE_THRESHOLD)
          ) {
            const bookmarkData = bookmarkMap.get(item.url);
            recommendations.push({
              url: item.url,
              title: item.title,
              favicon: item.favicon,
              lastVisitTime: item.lastVisitTime,
              visitsInWindow: visitedDaysCount,
              isBookmark: isBookmarked,
              tags: isBookmarked ? bookmarkData?.tags || [] : undefined,
            });
          }
        });

        return recommendations.sort((a, b) => b.visitsInWindow - a.visitsInWindow);
      };

      const finalRecommendations = processRecommendations(allItems, bookmarkUrls, bookmarkMap);
      setRecommendations(finalRecommendations);
      writeCachedRecommendations(hourKey, finalRecommendations);
    } catch (error) {
      logger.error('Error getting moment-in-history recommendations', error);
      setRecommendations([]);
    }
  }, [t]);

  useEffect(() => {
    void getRecommendations();
  }, [getRecommendations]);

  useEffect(() => {
    if (typeof chrome === 'undefined' || !chrome.bookmarks) return;
    const events = [
      chrome.bookmarks.onChanged,
      chrome.bookmarks.onCreated,
      chrome.bookmarks.onMoved,
      chrome.bookmarks.onRemoved,
    ];
    events.forEach(event => event?.addListener?.(clearCachedRecommendations));
    return () => {
      events.forEach(event => event?.removeListener?.(clearCachedRecommendations));
    };
  }, []);

  const refreshRecommendations = useCallback(() => getRecommendations(true), [getRecommendations]);

  return { recommendations, timeRange, refreshRecommendations };
}
