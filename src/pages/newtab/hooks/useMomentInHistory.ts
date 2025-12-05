import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RecommendationItem } from '../types';
import { getAllBookmarkTags } from '../../../db/indexedDB';

export function useMomentInHistory() {
  const { t } = useTranslation();
  const [recommendations, setRecommendations] = useState<RecommendationItem[]>([]);
  const [timeRange, setTimeRange] = useState('');

  const normalWebsiteThreshold = 2;
  const bookmarkedWebsiteThreshold = 1;

  useEffect(() => {
    if (!chrome || !chrome.history) {
      console.error(
        'Chrome History API is not available. Please ensure the extension is loaded correctly and has the "history" permission.',
      );
      return;
    }
    const getRecommendations = async () => {
      const TIME_WINDOW_HOURS = 1;
      const DAYS_TO_SEARCH = 14;

      // --- Get Bookmark Data ---
      const getBookmarkData = async (): Promise<{ urls: Set<string>; bookmarkMap: Map<string, { id: string; tags: string[] }> }> => {
        return new Promise(async resolve => {
          try {
            const [bookmarkTreeNodes, allTags] = await Promise.all([
              new Promise<chrome.bookmarks.BookmarkTreeNode[]>(resolve => 
                chrome.bookmarks.getTree(resolve)
              ),
              getAllBookmarkTags()
            ]);
            
            const urls = new Set<string>();
            const bookmarkMap = new Map<string, { id: string; tags: string[] }>();
            const tagsMap = new Map(allTags.map(bt => [bt.url, bt.tags]));
            
            const flatten = (nodes: chrome.bookmarks.BookmarkTreeNode[]) => {
              for (const node of nodes) {
                if (node.url) {
                  urls.add(node.url);
                  bookmarkMap.set(node.url, {
                    id: node.id,
                    tags: tagsMap.get(node.url) || []
                  });
                }
                if (node.children) {
                  flatten(node.children);
                }
              }
            };
            flatten(bookmarkTreeNodes);
            resolve({ urls, bookmarkMap });
          } catch (error) {
            console.error('Error getting bookmark data:', error);
            resolve({ urls: new Set(), bookmarkMap: new Map() });
          }
        });
      };

      const { urls: bookmarkUrls, bookmarkMap } = await getBookmarkData();

      const currentHour = new Date().getHours();
      const timeWindowStart = Math.max(0, currentHour - TIME_WINDOW_HOURS);
      const timeWindowEnd = Math.min(23, currentHour + TIME_WINDOW_HOURS);

      setTimeRange(t('home.timeRangeFormat', { start: timeWindowStart, end: timeWindowEnd + 1 }));

      const timeWindows: { start: number; end: number }[] = [];
      const now = new Date();

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

          const getFaviconUrl = (url: string) => {
            try {
              const urlObj = new URL(url);
              return `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=32`;
            } catch (error) {
              return 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>';
            }
          };

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

          if ((isBookmarked && visitedDaysCount >= bookmarkedWebsiteThreshold) || (!isBookmarked && visitedDaysCount >= normalWebsiteThreshold)) {
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
    };

    getRecommendations();
  }, [t]);

  return { recommendations, timeRange };
}
