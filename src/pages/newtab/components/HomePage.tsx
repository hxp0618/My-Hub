import React, { useState, useRef, useEffect } from 'react';
import { RecommendationItem, WebCombo } from '../types';
import { timeAgo } from '../utils';
import { ItemCard, type ItemCardAction } from './ItemCard';
import { Modal } from '../../../components/Modal';
import { ConfirmDialog } from '../../../components/ConfirmDialog';
import WebComboCard from './WebComboCard';
import { v4 as uuidv4 } from 'uuid';
import UnifiedSearchBar from '../../../components/UnifiedSearchBar';
import { useGlobalSearch } from '../../../hooks/useGlobalSearch';
import { ActionSearchResultItem, SearchResultItem, ToolIntentSearchResultItem, ToolSearchResultItem } from '../../../types/search';
import { ToolId } from '../../../types/tools';
import { createToolInvocation } from '../../../types/toolInvocation';
import type { ToolInvocation } from '../../../types/toolInvocation';
import { SearchActionTarget } from '../../../types/searchActions';
import { useToastContext } from '../../../contexts/ToastContext';
import type { ChatMessage } from '../../../types/llm';
import { useClickOutside } from '../../../hooks/useClickOutside';
import { useTranslation } from 'react-i18next';
import { createLogger } from '../../../utils/logger';
import { getFaviconUrl, getUrlHostname } from '../../../utils/favicon';
import { ensureClipboardReadPermission } from '../../../utils/extensionPermissions';
import {
  cardsPerRow as cardsPerRowStorage,
  homeItemOrder,
  noMoreDisplayed as noMoreDisplayedStorage,
  parseCardsPerRowValue,
  webCombos as webComboStorage,
  type StorageValues,
  StorageKey,
} from '../../../utils/storageManager';

const homePageLogger = createLogger('[HomePage]');
const AddBookmarkForm = React.lazy(() => import('./AddBookmarkForm'));
const WebComboForm = React.lazy(() => import('./WebComboForm'));
const SortableHomeGrid = React.lazy(() => import('./SortableHomeGrid'));
type BrowsableSearchResultItem = Exclude<SearchResultItem, ToolSearchResultItem | ActionSearchResultItem | ToolIntentSearchResultItem>;

const isToolSearchResult = (item: SearchResultItem): item is ToolSearchResultItem => item.type === 'tool';
const isActionSearchResult = (item: SearchResultItem): item is ActionSearchResultItem => item.type === 'action';
const isToolIntentSearchResult = (item: SearchResultItem): item is ToolIntentSearchResultItem => item.type === 'tool-intent';

interface HomePageProps {
  recommendations: RecommendationItem[];
  timeRange: string;
  onRefresh?: () => void;
  onOpenTool?: (toolId: ToolId, invocation?: ToolInvocation) => void;
  onOpenAction?: (target: SearchActionTarget) => void;
  onOpenCommandPalette?: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  recommendations,
  timeRange,
  onRefresh,
  onOpenTool,
  onOpenAction,
  onOpenCommandPalette,
}) => {
  const { t } = useTranslation();
  const toast = useToastContext();
  const [noMoreDisplayed, setNoMoreDisplayed] = useState<string[]>(() => {
    return noMoreDisplayedStorage.get();
  });
  const [searchTerm, setSearchTerm] = useState('');
  const { results: searchResults, loading: searchLoading } = useGlobalSearch(searchTerm);

  const [isBookmarkModalOpen, setIsBookmarkModalOpen] = useState(false);
  const [itemToAddBookmark, setItemToAddBookmark] = useState<RecommendationItem | BrowsableSearchResultItem | null>(null);
  const [clipboardItems, setClipboardItems] = useState<RecommendationItem[]>([]);
  const [isReadingClipboard, setIsReadingClipboard] = useState(false);

  // AI生成标签相关状态
  const [isGeneratingTags, setIsGeneratingTags] = useState(false);
  const [tagGenerationItem, setTagGenerationItem] = useState<RecommendationItem | BrowsableSearchResultItem | null>(null);
  const [generationStatusMessage, setGenerationStatusMessage] = useState('');
  const [tagGenerationAbortController, setTagGenerationAbortController] = useState<AbortController | null>(null);

  // Cards per row setting
  const [cardsPerRow, setCardsPerRow] = useState<StorageValues[StorageKey.CARDS_PER_ROW]>(() => {
    return cardsPerRowStorage.get();
  });

  // Item order state
  const [itemOrder, setItemOrder] = useState<string[]>(() => {
    return homeItemOrder.get();
  });

  // Web Combo state
  const [webCombos, setWebCombos] = useState<WebCombo[]>(() => {
    return webComboStorage.get();
  });
  const [isComboModalOpen, setIsComboModalOpen] = useState(false);
  const [editingCombo, setEditingCombo] = useState<WebCombo | null>(null);
  const [comboToDelete, setComboToDelete] = useState<WebCombo | null>(null);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  useClickOutside(moreMenuRef, () => setShowMoreMenu(false));

  const handleReadClipboard = async () => {
    setShowMoreMenu(false);
    setIsReadingClipboard(true);
    try {
      const permissionGranted = await ensureClipboardReadPermission();
      if (!permissionGranted) {
        toast.warning(t('home.clipboardPermissionDenied'));
        return;
      }

      const text = await navigator.clipboard.readText();
      const urls = Array.from(new Set(text.match(/https?:\/\/[^\s]+/g) ?? []));
      if (urls.length === 0) {
        toast.info(t('home.clipboardNoUrls'));
        return;
      }

      setClipboardItems(urls.map(url => ({
        url,
        title: url.length > 20 ? `${url.substring(0, 20)}...` : url,
        favicon: getFaviconUrl(url),
        lastVisitTime: Date.now(),
        visits: [],
        visitsInWindow: 1,
        isBookmark: false,
        tags: [],
      })));
      toast.success(t('home.clipboardUrlsLoaded', { count: urls.length }));
    } catch (error) {
      homePageLogger.warn('Failed to read clipboard contents', error);
      toast.error(t('home.clipboardReadFailed'));
    } finally {
      setIsReadingClipboard(false);
    }
  };

  useEffect(() => {
    webComboStorage.set(webCombos);
  }, [webCombos]);

  // Listen for cardsPerRow changes (from same tab or different tabs)
  useEffect(() => {
    const handleStorageChange = () => {
      setCardsPerRow(cardsPerRowStorage.get());
    };

    const handleCustomEvent = (e: Event) => {
      const customEvent = e as CustomEvent<unknown>;
      const newValue = parseCardsPerRowValue(customEvent.detail);
      if (newValue === null) return;
      setCardsPerRow(newValue);
    };

    // Listen for storage events (cross-tab)
    window.addEventListener('storage', handleStorageChange);
    // Listen for custom events (same-tab)
    window.addEventListener('cardsPerRowChanged', handleCustomEvent);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('cardsPerRowChanged', handleCustomEvent);
    };
  }, []);

  const gridGapRem = 1.5;
  const homeGridStyle = React.useMemo(() => ({
    '--home-grid-min': `min(100%, max(15rem, calc(${100 / cardsPerRow}% - ${(gridGapRem * (cardsPerRow - 1)) / cardsPerRow}rem)))`,
  }) as React.CSSProperties, [cardsPerRow]);

  const handleOrderChange = (newOrder: string[]) => {
    setItemOrder(newOrder);
    homeItemOrder.set(newOrder);
  };

  const handleAddToNoMoreDisplayed = (url: string) => {
    const updatedList = [...noMoreDisplayed, url];
    setNoMoreDisplayed(updatedList);
    noMoreDisplayedStorage.set(updatedList);
  };

  const handleOpenBookmarkModal = (item: RecommendationItem | BrowsableSearchResultItem) => {
    setItemToAddBookmark(item);
    setIsBookmarkModalOpen(true);
  };
  
  const handleSaveCombo = (comboData: Omit<WebCombo, 'id'> & { id?: string }) => {
    if (comboData.id) { // Editing existing combo
      setWebCombos(webCombos.map(c => c.id === comboData.id ? { ...c, ...comboData } : c));
    } else { // Creating new combo
      setWebCombos([...webCombos, { ...comboData, id: uuidv4() }]);
    }
    setIsComboModalOpen(false);
    setEditingCombo(null);
  };

  const handleDeleteCombo = (id: string) => {
    const combo = webCombos.find(c => c.id === id);
    if (combo) {
      setComboToDelete(combo);
    }
  };

  const handleConfirmDeleteCombo = () => {
    if (!comboToDelete) return;
    setWebCombos(webCombos.filter(c => c.id !== comboToDelete.id));
    setComboToDelete(null);
  };

  const handleOpenCreateComboModal = () => {
    setEditingCombo(null);
    setIsComboModalOpen(true);
    setShowMoreMenu(false);
  };

  const handleOpenEditComboModal = (combo: WebCombo) => {
    setEditingCombo(combo);
    setIsComboModalOpen(true);
  };

  const handleGenerateTags = async (item: RecommendationItem | BrowsableSearchResultItem) => {
    if (!item.title || !item.url) {
      toast.error(t('bookmarks.fillTitleUrl'));
      return;
    }

    setTagGenerationItem(item);
    setIsGeneratingTags(true);
    setGenerationStatusMessage(t('bookmarks.generatingTags'));

    const controller = new AbortController();
    setTagGenerationAbortController(controller);

    try {
      const [bookmarkDb, promptModule, tagModule, llmModule] = await Promise.all([
        import('../../../db/indexedDB'),
        import('../../../lib/tagGenerationPrompts'),
        import('../../../lib/bookmarkTags'),
        import('../../../services/llmService'),
      ]);
      const { getAllBookmarkTags, addBookmarkTag } = bookmarkDb;
      const { buildTagGenerationPrompt } = promptModule;
      const { parseGeneratedTags } = tagModule;
      const { sendMessage } = llmModule;
      const existingBookmarkTags = await getAllBookmarkTags();
      const allExistingTags = Array.from(new Set(
        existingBookmarkTags.flatMap((bookmark: { tags: string[] }) => bookmark.tags)
      ));

      const systemPrompt = buildTagGenerationPrompt(allExistingTags);
      const userMessage = t('tagGeneration.promptTemplate', { title: item.title, url: item.url });

      const messages: ChatMessage[] = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ];

      let generatedContent = '';

      await sendMessage(
        messages,
        {
          onUpdate: (chunk: string) => {
            generatedContent += chunk;
          },
          onFinish: async () => {
            const generatedTags = parseGeneratedTags(generatedContent);

            if (generatedTags.length > 0) {
                // Check if item is already a bookmark
                const isBookmark = 'type' in item ? item.type === 'bookmark' : item.isBookmark;

                if (!isBookmark) {
                  // Create bookmark first, then add tags
                  try {
                    await chrome.bookmarks.create({
                      title: item.title,
                      url: item.url,
                    });

                    // Add tags to the newly created bookmark
                    await addBookmarkTag({
                      url: item.url!,
                      tags: generatedTags
                    });

                    setGenerationStatusMessage(t('bookmarks.tagGenerateSuccess', { count: generatedTags.length }));
                    toast.success(t('bookmarks.tagGenerateSuccess', { count: generatedTags.length }));
                    // 刷新推荐列表以显示新标签
                    onRefresh?.();
                  } catch (error) {
                    homePageLogger.error('Failed to create bookmark while saving generated tags', error);
                    toast.error(t('bookmarks.addError'));
                  }
                } else {
                  // Item is already a bookmark, just add tags
                  await addBookmarkTag({
                    url: item.url!,
                    tags: generatedTags
                  });
                  setGenerationStatusMessage(t('bookmarks.tagGenerateSuccess', { count: generatedTags.length }));
                  toast.success(t('bookmarks.tagGenerateSuccess', { count: generatedTags.length }));
                  // 刷新推荐列表以显示新标签
                  onRefresh?.();
                }
            } else {
              setGenerationStatusMessage(t('bookmarks.tagGenerateFailed'));
              toast.error(t('bookmarks.tagGenerateFailed'));
            }

            setIsGeneratingTags(false);
            setTagGenerationAbortController(null);
            setTimeout(() => {
              setTagGenerationItem(null);
              setGenerationStatusMessage('');
            }, 2000);
          },
          onError: (error: Error) => {
            homePageLogger.error('Failed to generate tags', error);
            setGenerationStatusMessage(t('bookmarks.tagGenerateRetry'));
            toast.error(t('bookmarks.tagGenerateRetry'));
            setIsGeneratingTags(false);
            setTagGenerationAbortController(null);
            setTimeout(() => {
              setTagGenerationItem(null);
              setGenerationStatusMessage('');
            }, 2000);
          },
        },
        controller.signal
      );
    } catch (error) {
      homePageLogger.error('Tag generation request failed', error);
      setGenerationStatusMessage(t('bookmarks.tagGenerateRetry'));
      toast.error(t('bookmarks.tagGenerateRetry'));
      setIsGeneratingTags(false);
      setTagGenerationAbortController(null);
      setTimeout(() => {
        setTagGenerationItem(null);
        setGenerationStatusMessage('');
      }, 2000);
    }
  };

  const handleCancelTagGeneration = () => {
    if (tagGenerationAbortController) {
      tagGenerationAbortController.abort();
      setTagGenerationAbortController(null);
      setIsGeneratingTags(false);
      setGenerationStatusMessage(t('bookmarks.tagGenerateCancelled'));
      setTimeout(() => {
        setTagGenerationItem(null);
        setGenerationStatusMessage('');
      }, 1500);
    }
  };

  const itemActions = (item: RecommendationItem | BrowsableSearchResultItem): ItemCardAction[] => {
    const actions: ItemCardAction[] = [];

    const isBookmark = 'type' in item ? item.type === 'bookmark' : item.isBookmark;

    if (!isBookmark) {
      actions.push({
        label: t('history.addBookmark'),
        icon: 'bookmark_add',
        onClick: () => handleOpenBookmarkModal(item),
      });
    }

    actions.push({
      label: t('bookmarks.generateTags'),
      icon: 'auto_awesome',
      onClick: () => handleGenerateTags(item),
    });

    actions.push({
      label: t('home.dontShowAgain'),
      icon: 'visibility_off',
      onClick: () => handleAddToNoMoreDisplayed(item.url!),
    });

    return actions;
  };

  const filteredRecommendations = React.useMemo(
    () => recommendations.filter(item => !noMoreDisplayed.includes(item.url)),
    [recommendations, noMoreDisplayed]
  );

  const allItems = React.useMemo(
    () => [...clipboardItems, ...filteredRecommendations],
    [clipboardItems, filteredRecommendations]
  );

  // Sort items based on saved order
  const sortedAllItems = React.useMemo(() => {
    if (itemOrder.length === 0) return allItems;

    const itemMap = new Map(allItems.map(item => [item.url, item]));
    const ordered: RecommendationItem[] = [];
    const unordered: RecommendationItem[] = [];

    itemOrder.forEach(url => {
      const item = itemMap.get(url);
      if (item) {
        ordered.push(item);
        itemMap.delete(url);
      }
    });

    itemMap.forEach(item => unordered.push(item));

    return [...ordered, ...unordered];
  }, [allItems, itemOrder]);

  return (
    <div className="home-page-shell nb-bg">
      <header className="home-page-toolbar">
        <div className="home-page-title-group">
          <div className="home-page-title-main">
            <span className="material-symbols-outlined text-xl nb-text">schedule</span>
            <h2 className="text-xl font-bold nb-text">{t('home.momentsInHistory')}</h2>
          </div>
          <span className="home-page-description text-sm nb-text-secondary">{t('home.momentsDescription')}</span>
          <span className="px-2 py-1 text-xs bg-[color:var(--nb-accent-blue)] border-2 border-[color:var(--nb-border)] nb-text-on-accent font-medium">
            {timeRange}
          </span>
        </div>
        
        <div className="home-page-actions">
          <div className="home-page-search">
            <UnifiedSearchBar
              mode="global"
              value={searchTerm}
              onChange={setSearchTerm}
              loading={searchLoading}
              placeholder={t('home.searchPlaceholder')}
            />
          </div>

          {onOpenCommandPalette && (
            <button
              type="button"
              className="home-page-command-help nb-btn nb-btn-ghost p-2"
              onClick={onOpenCommandPalette}
              aria-label={t('home.commandHelp')}
              title={t('home.commandHelp')}
            >
              <span className="material-symbols-outlined text-lg" aria-hidden="true">keyboard_command_key</span>
            </button>
          )}

          {/* 网格选择器 */}
          <div className="home-page-density-select nb-card-static flex items-center space-x-2 px-3 py-2">
            <span className="material-symbols-outlined text-sm nb-text-secondary">grid_view</span>
            <select
              aria-label={t('settings.cardsPerRow')}
              value={cardsPerRow}
              onChange={(e) => {
                const newValue = parseCardsPerRowValue(e.target.value);
                if (newValue === null) return;
                setCardsPerRow(newValue);
                cardsPerRowStorage.set(newValue);
                window.dispatchEvent(new CustomEvent('cardsPerRowChanged', { detail: newValue }));
              }}
              className="text-sm border-0 bg-transparent focus:outline-none focus:ring-0 cursor-pointer nb-text"
            >
              <option value="2">{t('settings.cardsPerRowOption', { count: 2 })}</option>
              <option value="3">{t('settings.cardsPerRowOption', { count: 3 })}</option>
              <option value="4">{t('settings.cardsPerRowOption', { count: 4 })}</option>
              <option value="5">{t('settings.cardsPerRowOption', { count: 5 })}</option>
              <option value="6">{t('settings.cardsPerRowOption', { count: 6 })}</option>
            </select>
          </div>

          <div className="relative" ref={moreMenuRef}>
              <button
                type="button"
                onClick={() => setShowMoreMenu(!showMoreMenu)}
                className="home-page-more-button nb-btn nb-btn-ghost p-2"
                aria-label={t('home.moreActions')}
                aria-expanded={showMoreMenu}
                aria-haspopup="menu"
              >
                  <span className="material-symbols-outlined nb-text text-lg">more_vert</span>
              </button>
              {showMoreMenu && (
                  <div className="absolute right-0 mt-2 w-48 nb-card-static shadow-[var(--nb-shadow)] z-30" role="menu">
                      <div className="py-1">
                          <button
                              type="button"
                              onClick={handleOpenCreateComboModal}
                              className="w-full flex items-center px-4 py-2.5 text-sm text-[color:var(--nb-text)] hover:bg-[color:var(--nb-accent-yellow)] hover:text-[color:var(--nb-text-on-accent)] cursor-pointer transition-colors"
                              role="menuitem"
                          >
                              <span className="material-symbols-outlined mr-2 text-base">add_circle</span>
                              {t('home.createWebCombo')}
                          </button>
                          <button
                              type="button"
                              onClick={handleReadClipboard}
                              disabled={isReadingClipboard}
                              className="w-full flex min-h-11 items-center px-4 py-2.5 text-sm text-[color:var(--nb-text)] hover:bg-[color:var(--nb-panel-muted)] cursor-pointer transition-colors disabled:cursor-wait"
                              role="menuitem"
                          >
                              <span className="material-symbols-outlined mr-2 text-base" aria-hidden="true">
                                {isReadingClipboard ? 'progress_activity' : 'content_paste'}
                              </span>
                              {t('home.fromClipboard')}
                          </button>
                      </div>
                  </div>
              )}
          </div>
        </div>
      </header>

      {searchTerm ? (
        <div>
          {/* 搜索结果标题 - 紧凑版 */}
          <div className="flex items-center gap-3 mb-4">
            <span className="material-symbols-outlined text-xl nb-text">search</span>
            <h2 className="text-xl font-bold nb-text">{t('home.searchResults')}</h2>
            <span className="px-2 py-1 text-xs bg-[color:var(--nb-accent-yellow)] border-2 border-[color:var(--nb-border)] text-[color:var(--nb-text-on-accent)] font-medium">
              {searchResults.length}
            </span>
          </div>
          <div className="home-card-grid" style={homeGridStyle}>
            {searchResults.map(item => {
              if (isToolIntentSearchResult(item)) {
                return (
                  <button
                    key={`${item.intentId}-${item.toolId}-${item.input}`}
                    type="button"
                    onClick={() => onOpenTool?.(
                      item.toolId,
                      createToolInvocation(item.toolId, item.input, item.mode, 'home-search'),
                    )}
                    className="home-search-result-card nb-card relative flex flex-col p-5 text-left group"
                    aria-label={item.title}
                  >
                    <div className="absolute -top-2 -right-2 w-4 h-4 border-2 border-[color:var(--nb-border)] bg-[color:var(--nb-deco-mint)] opacity-60 pointer-events-none"></div>
                    <div className="flex items-start">
                      <div className="w-9 h-9 mr-3 flex-shrink-0 flex items-center justify-center border-2 border-[color:var(--nb-border)] bg-[color:var(--nb-accent-yellow)] shadow-[var(--nb-shadow-sm)]">
                        <span className="material-symbols-outlined text-[color:var(--nb-text-on-accent)] text-xl">{item.icon}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-bold nb-text text-base leading-tight line-clamp-2" title={item.title}>
                          {item.title}
                        </h3>
                        <p className="text-xs nb-text-secondary truncate mt-1.5 font-medium">
                          {t('home.smartToolCommandCategory', { confidence: Math.round(item.confidence * 100) })}
                        </p>
                      </div>
                    </div>
                    <p className="mt-4 text-sm nb-text-secondary line-clamp-2">
                      {item.description}
                    </p>
                    <span className="mt-auto pt-3 inline-flex items-center gap-1 text-xs font-bold nb-text uppercase tracking-wide">
                      {t('home.openToolAction')}
                      <span className="material-symbols-outlined text-sm">arrow_forward</span>
                    </span>
                  </button>
                );
              }

              if (isToolSearchResult(item)) {
                return (
                  <button
                    key={item.toolId}
                    type="button"
                    onClick={() => onOpenTool?.(item.toolId)}
                    className="home-search-result-card nb-card relative flex flex-col p-5 text-left group"
                    aria-label={t('home.openTool', { name: item.title })}
                  >
                    <div className="absolute -top-2 -right-2 w-4 h-4 border-2 border-[color:var(--nb-border)] bg-[color:var(--nb-deco-mint)] opacity-60 pointer-events-none"></div>
                    <div className="flex items-start">
                      <div className="w-9 h-9 mr-3 flex-shrink-0 flex items-center justify-center border-2 border-[color:var(--nb-border)] bg-[color:var(--nb-accent-yellow)] shadow-[var(--nb-shadow-sm)]">
                        <span className="material-symbols-outlined text-[color:var(--nb-text-on-accent)] text-xl">{item.icon}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-bold nb-text text-base leading-tight line-clamp-2" title={item.title}>
                          {item.title}
                        </h3>
                        <p className="text-xs nb-text-secondary truncate mt-1.5 font-medium">
                          {t('home.toolCommandCategory', { category: item.category })}
                        </p>
                      </div>
                    </div>
                    <p className="mt-4 text-sm nb-text-secondary line-clamp-2">
                      {item.description}
                    </p>
                    <span className="mt-auto pt-3 inline-flex items-center gap-1 text-xs font-bold nb-text uppercase tracking-wide">
                      {t('home.openToolAction')}
                      <span className="material-symbols-outlined text-sm">arrow_forward</span>
                    </span>
                  </button>
                );
              }

              if (isActionSearchResult(item)) {
                return (
                  <button
                    key={item.actionId}
                    type="button"
                    onClick={() => onOpenAction?.(item.target)}
                    className="home-search-result-card nb-card relative flex flex-col p-5 text-left group"
                    aria-label={t('home.openAction', { name: item.title })}
                  >
                    <div className="absolute -top-2 -right-2 w-4 h-4 border-2 border-[color:var(--nb-border)] bg-[color:var(--nb-deco-sky)] opacity-60 pointer-events-none"></div>
                    <div className="flex items-start">
                      <div className="w-9 h-9 mr-3 flex-shrink-0 flex items-center justify-center border-2 border-[color:var(--nb-border)] bg-[color:var(--nb-accent-blue)] shadow-[var(--nb-shadow-sm)]">
                        <span className="material-symbols-outlined nb-text text-xl">{item.icon}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-bold nb-text text-base leading-tight line-clamp-2" title={item.title}>
                          {item.title}
                        </h3>
                        <p className="text-xs nb-text-secondary truncate mt-1.5 font-medium">
                          {t('home.actionCommandCategory')}
                        </p>
                      </div>
                    </div>
                    <p className="mt-4 text-sm nb-text-secondary line-clamp-2">
                      {item.description}
                    </p>
                    <span className="mt-auto pt-3 inline-flex items-center gap-1 text-xs font-bold nb-text uppercase tracking-wide">
                      {t('home.openActionAction')}
                      <span className="material-symbols-outlined text-sm">arrow_forward</span>
                    </span>
                  </button>
                );
              }

              const hostname = getUrlHostname(item.url);
              return (
                <ItemCard
                  key={item.type === 'history' ? item.url! : item.id}
                  href={item.url!}
                  title={item.title!}
                  hostname={hostname}
                  faviconUrl={getFaviconUrl(item.url)}
                  visitCount={'visitCount' in item ? item.visitCount : undefined}
                  timeLabel={timeAgo((item.type === 'history' ? item.lastVisitTime : item.dateAdded) || 0)}
                  tags={'tags' in item ? (item.tags as string[]) : undefined}
                  actions={itemActions(item)}
                  type={item.type}
                />
              );
            })}
          </div>
        </div>
      ) : (
        <>
          <React.Suspense
            fallback={(
              <div className="home-card-grid" style={homeGridStyle}>
                {sortedAllItems.map(item => (
                  <ItemCard
                    key={item.url}
                    href={item.url}
                    title={item.title}
                    hostname={getUrlHostname(item.url)}
                    faviconUrl={item.favicon}
                    visitCount={item.visitsInWindow}
                    timeLabel={timeAgo(item.lastVisitTime)}
                    tags={item.tags}
                    actions={itemActions(item)}
                  />
                ))}
              </div>
            )}
          >
            <SortableHomeGrid
              items={sortedAllItems}
              gridStyle={homeGridStyle}
              getActions={itemActions}
              onOrderChange={handleOrderChange}
            />
          </React.Suspense>
          
          {webCombos.length > 0 && (
            <div className="mt-8 pt-6 border-t-2 border-[color:var(--nb-border)]/20">
                {/* Web Combos 标题 - 紧凑版 */}
                <div className="flex items-center gap-3 mb-4">
                  <span className="material-symbols-outlined text-xl nb-text">collections_bookmark</span>
                  <h2 className="text-xl font-bold nb-text">{t('home.webCombos')}</h2>
                  <span className="px-2 py-1 text-xs bg-[color:var(--nb-accent-green)] border-2 border-[color:var(--nb-border)] text-[color:var(--nb-text-on-accent)] font-medium">
                    {webCombos.length}
                  </span>
                </div>
                <div className="home-card-grid" style={homeGridStyle}>
                    {webCombos.map(combo => (
                        <WebComboCard
                            key={combo.id}
                            combo={combo}
                            onEdit={handleOpenEditComboModal}
                            onDelete={handleDeleteCombo}
                        />
                    ))}
                </div>
            </div>
          )}
        </>
      )}

      <Modal isOpen={isBookmarkModalOpen} onClose={() => setIsBookmarkModalOpen(false)} title={t('modal.addBookmark')}>

        {itemToAddBookmark && (
          <React.Suspense fallback={<div className="min-h-24" role="status" aria-label={t('common.loading')} />}>
            <AddBookmarkForm
              initialUrl={itemToAddBookmark.url!}
              initialTitle={itemToAddBookmark.title!}
              onSuccess={() => {
                setIsBookmarkModalOpen(false);
              }}
            />
          </React.Suspense>
        )}
      </Modal>

      <Modal isOpen={isComboModalOpen} onClose={() => setIsComboModalOpen(false)} title={editingCombo ? t('home.editWebCombo') : t('home.createWebCombo')}>
        <React.Suspense fallback={<div className="min-h-24" role="status" aria-label={t('common.loading')} />}>
          <WebComboForm
              combo={editingCombo}
              onSave={handleSaveCombo}
              onCancel={() => {
                  setIsComboModalOpen(false);
                  setEditingCombo(null);
              }}
          />
        </React.Suspense>
      </Modal>

      <ConfirmDialog
        isOpen={!!comboToDelete}
        onClose={() => setComboToDelete(null)}
        onConfirm={handleConfirmDeleteCombo}
        title={t('actions.delete')}
        message={t('home.deleteWebComboConfirm')}
        confirmText={t('common.delete')}
        danger
      />

      {/* AI生成标签进度模态框 - 增强 Neo-Brutalism 风格 */}
      {tagGenerationItem && (
        <Modal
          isOpen
          onClose={handleCancelTagGeneration}
          title={t('bookmarks.generatingTags')}
          widthClass="max-w-md"
          closeOnBackdrop={false}
          closeOnEscape={false}
          showCloseButton={false}
        >
          <div className="mb-6 p-4 bg-[color:var(--nb-bg)] border-2 border-[color:var(--nb-border)]">
            <p className="nb-text-secondary text-sm font-medium truncate">
              {tagGenerationItem.title}
            </p>
          </div>

          <div className="flex items-center justify-center py-8" aria-hidden="true">
            {isGeneratingTags ? (
              <div className="relative">
                <div className="w-16 h-16 border-4 border-[color:var(--nb-border)]/20"></div>
                <div className="absolute top-0 left-0 w-16 h-16 border-4 border-[color:var(--nb-accent-yellow)] border-t-transparent animate-spin"></div>
              </div>
            ) : (
              <div className="w-16 h-16 flex items-center justify-center bg-[color:var(--nb-accent-green)] border-4 border-[color:var(--nb-border)] shadow-[var(--nb-shadow)]">
                <span className="material-symbols-outlined text-4xl nb-text-on-accent">check</span>
              </div>
            )}
          </div>

          <p className="mb-6 text-center nb-text font-bold text-sm uppercase tracking-wide" role="status" aria-live="polite">
            {generationStatusMessage}
          </p>

          <div className="flex justify-end">
            {isGeneratingTags && (
              <button
                type="button"
                onClick={handleCancelTagGeneration}
                className="nb-btn nb-btn-danger px-6 py-2.5"
              >
                {t('common.cancel')}
              </button>
            )}
          </div>
        </Modal>
      )}
    </div>
  )
};
