import { useState, useEffect } from 'react';
import { useBookmarks } from '../pages/newtab/hooks/useBookmarks';
import { SearchResultItem } from '../types/search';
import { flattenBookmarks } from '../utils/bookmarkUtils';

const SEARCH_DEBOUNCE_TIME = 300; // ms

export const useGlobalSearch = (searchTerm: string) => {
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { bookmarks: allBookmarks, loading: bookmarksLoading } = useBookmarks();

  useEffect(() => {
    const search = async () => {
      if (!searchTerm) {
        setResults([]);
        setError(null);
        return;
      }

      setLoading(true);
      setError(null);

      // 1. 搜索历史记录
      const historyPromise = chrome.history.search({ text: searchTerm, maxResults: 100 })
        .then(historyItems =>
          historyItems.map(item => ({ ...item, type: 'history' as const }))
        )
        .catch(err => {
          console.error('History search failed:', err);
          return []; // 返回空数组，继续搜索书签
        });

      // 2. 搜索书签
      const bookmarkPromise = new Promise<SearchResultItem[]>((resolve) => {
        try {
          const flattenedBookmarks = flattenBookmarks(allBookmarks);
          const lowerCaseSearchTerm = searchTerm.toLowerCase();
          const bookmarkResults = flattenedBookmarks
            .filter(bookmark =>
              bookmark.title.toLowerCase().includes(lowerCaseSearchTerm) ||
              (bookmark.url && bookmark.url.toLowerCase().includes(lowerCaseSearchTerm)) ||
              (bookmark.tags && bookmark.tags.some(tag => tag.toLowerCase().includes(lowerCaseSearchTerm)))
            )
            .map(bookmark => ({ ...bookmark, type: 'bookmark' as const }));
          resolve(bookmarkResults);
        } catch (err) {
          console.error('Bookmark search failed:', err);
          resolve([]); // 返回空数组
        }
      });

      // 并行执行所有搜索
      try {
        const [historyResults, bookmarkResults] = await Promise.all([historyPromise, bookmarkPromise]);

        // 检查是否有任何结果
        const totalResults = [...historyResults, ...bookmarkResults];
        if (totalResults.length === 0 && historyResults.length === 0 && bookmarkResults.length === 0) {
          setError('No results found. Try a different search term.');
        }

        // 合并并排序结果（这里简单合并，可以根据需求增加排序逻辑）
        setResults(totalResults);
      } catch (error) {
        console.error('Error during global search:', error);
        setError('Search failed. Please try again.');
        setResults([]);
      } finally {
        setLoading(false);
      }
    };

    const debounceTimeout = setTimeout(() => {
      search();
    }, SEARCH_DEBOUNCE_TIME);

    return () => clearTimeout(debounceTimeout);
  }, [searchTerm, allBookmarks]);

  return {
    loading: loading || bookmarksLoading,
    results,
    error,
  };
};
