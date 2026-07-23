import { useState, useEffect } from 'react';
import { useBookmarks } from '../pages/newtab/hooks/useBookmarks';
import { SearchResultItem } from '../types/search';
import { HistoryItem } from '../pages/newtab/types';
import { flattenBookmarks } from '../utils/bookmarkUtils';
import { getAllToolsMetadata } from '../types/tools';
import { SEARCH_ACTIONS } from '../types/searchActions';
import i18n from '../i18n';
import { getFaviconUrl } from '../utils/favicon';
import {
  bookmarkMatchesSearchCommand,
  historyItemMatchesSearchCommand,
  parseGlobalSearchCommand,
} from '../utils/searchCommands';
import { detectToolIntents, getToolIntentInvocationInput } from '../utils/toolIntent';
import { createLogger } from '../utils/logger';

const SEARCH_DEBOUNCE_TIME = 300; // ms
const logger = createLogger('[useGlobalSearch]');

const getChromeHistoryApi = () => (
  typeof chrome !== 'undefined' &&
  typeof (chrome as { history?: { search?: unknown } }).history?.search === 'function'
    ? chrome.history
    : null
);

export const useGlobalSearch = (searchTerm: string) => {
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { bookmarks: allBookmarks, loading: bookmarksLoading } = useBookmarks();

  useEffect(() => {
    const search = async () => {
      const normalizedSearchTerm = searchTerm.trim();

      if (!normalizedSearchTerm) {
        setResults([]);
        setError(null);
        return;
      }

      setLoading(true);
      setError(null);
      const command = parseGlobalSearchCommand(normalizedSearchTerm);

      if (command.type === 'tool') {
        const toolResults = getAllToolsMetadata()
          .filter(metadata => {
            const name = i18n.t(metadata.nameKey).toLowerCase();
            const description = i18n.t(metadata.descriptionKey).toLowerCase();
            return !command.query ||
              metadata.id.toLowerCase().includes(command.query) ||
              name.includes(command.query) ||
              description.includes(command.query) ||
              metadata.category.toLowerCase().includes(command.query);
          })
          .map<SearchResultItem>(metadata => ({
            type: 'tool',
            toolId: metadata.id,
            title: i18n.t(metadata.nameKey),
            description: i18n.t(metadata.descriptionKey),
            icon: metadata.icon,
            category: metadata.category,
          }));

        setResults(toolResults);
        setError(toolResults.length === 0 ? i18n.t('search.noResults') : null);
        setLoading(false);
        return;
      }

      if (command.type === 'action') {
        const actionResults = SEARCH_ACTIONS
          .filter(action => {
            const title = i18n.t(action.titleKey).toLowerCase();
            const description = i18n.t(action.descriptionKey).toLowerCase();
            return !command.query ||
              action.id.includes(command.query) ||
              title.includes(command.query) ||
              description.includes(command.query) ||
              action.keywords.some(keyword => keyword.toLowerCase().includes(command.query));
          })
          .map<SearchResultItem>(action => ({
            type: 'action',
            actionId: action.id,
            title: i18n.t(action.titleKey),
            description: i18n.t(action.descriptionKey),
            icon: action.icon,
            target: action.target,
          }));

        setResults(actionResults);
        setError(actionResults.length === 0 ? i18n.t('search.noResults') : null);
        setLoading(false);
        return;
      }

      // 1. 搜索历史记录
      const smartToolResults = command.type === 'default'
        ? detectToolIntents(normalizedSearchTerm)
          .filter(intent => intent.confidence >= 0.78)
          .map<SearchResultItem>(intent => ({
            type: 'tool-intent',
            intentId: intent.id,
            toolId: intent.toolId,
            mode: intent.mode,
            title: i18n.t(intent.titleKey),
            description: i18n.t(intent.descriptionKey),
            icon: getAllToolsMetadata().find(tool => tool.id === intent.toolId)?.icon ?? 'auto_fix_high',
            input: getToolIntentInvocationInput(intent, normalizedSearchTerm),
            confidence: intent.confidence,
          }))
        : [];

      const shouldSearchHistory = command.type !== 'tag';
      const historyApi = getChromeHistoryApi();
      const historyPromise = shouldSearchHistory && historyApi ? historyApi.search({ text: command.rawQuery, maxResults: 100 })
        .then(historyItems =>
          historyItems
            .filter(item => historyItemMatchesSearchCommand(item, command))
            .map<SearchResultItem>((item): HistoryItem & { type: 'history' } => ({
              type: 'history',
              url: item.url || '',
              title: item.title || item.url || '',
              visitCount: item.visitCount || 0,
              lastVisitTime: item.lastVisitTime || 0,
              favicon: getFaviconUrl(item.url),
              deviceId: 'local',
              deviceName: 'Local',
            }))
        )
        .catch(err => {
          logger.error('History search failed', err);
          return []; // 返回空数组，继续搜索书签
        }) : Promise.resolve([]);

      // 2. 搜索书签
      const bookmarkPromise = new Promise<SearchResultItem[]>((resolve) => {
        try {
          const flattenedBookmarks = flattenBookmarks(allBookmarks);
          const bookmarkResults = flattenedBookmarks
            .filter(bookmark => bookmarkMatchesSearchCommand(bookmark, command))
            .map(bookmark => ({ ...bookmark, type: 'bookmark' as const }));
          resolve(bookmarkResults);
        } catch (err) {
          logger.error('Bookmark search failed', err);
          resolve([]); // 返回空数组
        }
      });

      // 并行执行所有搜索
      try {
        const [historyResults, bookmarkResults] = await Promise.all([historyPromise, bookmarkPromise]);

        // 检查是否有任何结果
        const totalResults: SearchResultItem[] = [...smartToolResults, ...historyResults, ...bookmarkResults];
        if (totalResults.length === 0 && historyResults.length === 0 && bookmarkResults.length === 0) {
          setError(i18n.t('search.noResults'));
        }

        // 合并并排序结果（这里简单合并，可以根据需求增加排序逻辑）
        setResults(totalResults);
      } catch (error) {
        logger.error('Error during global search', error);
        setError(i18n.t('search.searchFailed'));
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
