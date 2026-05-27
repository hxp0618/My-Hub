import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useEnhancedHistory } from '../hooks/useEnhancedHistory';
import { HistoryItem } from '../types';
import { ItemCard } from './ItemCard';
import { DateNavigator } from '../../../components/DateNavigator';
import { SelectionActionBar, ActionItem } from '../../../components/SelectionActionBar';
import { format } from 'date-fns';
import { Modal } from '../../../components/Modal';
import AddBookmarkForm from './AddBookmarkForm';
import UnifiedSearchBar from '../../../components/UnifiedSearchBar';
import { HistoryItemSkeleton } from '../../../components/SkeletonLoader';
import { ConfirmDialog } from '../../../components/ConfirmDialog';
import { useToastContext } from '../../../contexts/ToastContext';
import { useTranslation } from 'react-i18next';
import { getAllBookmarkTags, addBookmarkTag } from '../../../db/indexedDB';
import { parseGeneratedTags } from '../../../lib/bookmarkTags';
import { buildTagGenerationPrompt } from '../../../lib/tagGenerationPrompts';
import { sendMessage } from '../../../services/llmService';
import type { ChatMessage } from '../../../types/llm';
import { getFaviconUrl, getUrlHostname } from '../../../utils/favicon';
import { createLogger } from '../../../utils/logger';
import {
  cardsPerRow as cardsPerRowStorage,
  parseCardsPerRowValue,
  type StorageValues,
  StorageKey,
} from '../../../utils/storageManager';

const logger = createLogger('[HistoryPage]');

export const HistoryPage: React.FC = () => {
  const { t } = useTranslation();
  const {
    historyItems,
    isLoading,
    filters,
    setFilters,
    deleteHistoryByUrl,
    hasMore,
    loadMore,
    availableDates,
  } = useEnhancedHistory();

  const toast = useToastContext();
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });
  const [isBookmarkModalOpen, setIsBookmarkModalOpen] = useState(false);
  const [itemToAddBookmark, setItemToAddBookmark] = useState<HistoryItem | null>(null);

  // AI生成标签相关状态
  const [isGeneratingTags, setIsGeneratingTags] = useState(false);
  const [tagGenerationItem, setTagGenerationItem] = useState<HistoryItem | null>(null);
  const [generationStatusMessage, setGenerationStatusMessage] = useState('');
  const [tagGenerationAbortController, setTagGenerationAbortController] = useState<AbortController | null>(null);

  // Cards per row setting (global)
  const [cardsPerRow, setCardsPerRow] = useState<StorageValues[StorageKey.CARDS_PER_ROW]>(() => {
    return cardsPerRowStorage.get();
  });

  const mainContentRef = useRef<HTMLElement | null>(null);

  const handleScroll = useCallback(() => {
    const element = mainContentRef.current;
    if (element) {
        const { scrollTop, scrollHeight, clientHeight } = element;
        if (scrollTop + clientHeight >= scrollHeight - 300 && hasMore && !isLoading) {
            loadMore();
        }
    }
  }, [hasMore, isLoading, loadMore]);

  useEffect(() => {
    const element = mainContentRef.current;
    if (element) {
        element.addEventListener('scroll', handleScroll);
        return () => {
            element.removeEventListener('scroll', handleScroll);
        };
    }
  }, [handleScroll]);

  // Listen for global cardsPerRow changes
  useEffect(() => {
    const handleCustomEvent = (e: Event) => {
      const customEvent = e as CustomEvent<unknown>;
      const newValue = parseCardsPerRowValue(customEvent.detail);
      if (newValue === null) return;
      setCardsPerRow(newValue);
    };

    window.addEventListener('cardsPerRowChanged', handleCustomEvent);
    return () => window.removeEventListener('cardsPerRowChanged', handleCustomEvent);
  }, []);

  // Get grid columns class based on cardsPerRow
  const getGridClass = () => {
    const baseClass = 'grid gap-4 transition-all duration-300';
    switch (cardsPerRow) {
      case 2:
        return `${baseClass} grid-cols-1 md:grid-cols-2`;
      case 3:
        return `${baseClass} grid-cols-1 md:grid-cols-2 lg:grid-cols-3`;
      case 4:
        return `${baseClass} grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`;
      case 5:
        return `${baseClass} grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5`;
      case 6:
        return `${baseClass} grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6`;
      default:
        return `${baseClass} grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`;
    }
  };

  const handleDateChange = useCallback(({ startTime, endTime }: { startTime: number; endTime: number }) => {
    setFilters(prev => ({ ...prev, startTime, endTime }));
  }, [setFilters]);
  
  const toggleSelection = (url: string) => {
    setSelectedItems(prev =>
      prev.includes(url) ? prev.filter(u => u !== url) : [...prev, url]
    );
  };

  const groupedHistory = useMemo(() => {
    const isAllMode = filters.startTime === 0;
    return historyItems.reduce((acc, item) => {
      const date = new Date(item.lastVisitTime);
      const key = isAllMode 
        ? format(date, 'yyyy-MM-dd HH:00') // 显示日期和小时
        : format(date, 'HH:00'); // 只显示小时
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(item);
      return acc;
    }, {} as Record<string, HistoryItem[]>);
  }, [historyItems, filters.startTime]);

  const handleDeleteSingleItem = useCallback((url: string) => {
    setConfirmModal({
      isOpen: true,
      title: t('common.delete'),
      message: t('history.deleteConfirm', { count: 1 }),
      onConfirm: () => {
        deleteHistoryByUrl(url);
        toast.success(t('history.deleteSingle'));
      },
    });
  }, [t, deleteHistoryByUrl, toast]);

  const handleOpenBookmarkModal = useCallback((item: HistoryItem) => {
    setItemToAddBookmark(item);
    setIsBookmarkModalOpen(true);
  }, []);

  const handleDeleteSelected = useCallback(() => {
    const count = selectedItems.length;
    setConfirmModal({
      isOpen: true,
      title: t('history.deleteSelected'),
      message: t('history.deleteConfirm', { count }),
      onConfirm: () => {
        selectedItems.forEach(url => deleteHistoryByUrl(url));
        setIsMultiSelectMode(false);
        setSelectedItems([]);
        toast.success(t('history.deleteSuccess', { count }));
      },
    });
  }, [selectedItems, t, deleteHistoryByUrl, toast]);

  const handleGenerateTags = useCallback(async (item: HistoryItem) => {
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
      const existingBookmarkTags = await getAllBookmarkTags();
      const allExistingTags = Array.from(new Set(
        existingBookmarkTags.flatMap((bookmark: { tags: string[] }) => bookmark.tags)
      ));

      const systemPrompt = buildTagGenerationPrompt(allExistingTags);
      const userMessage = `标题: "${item.title}"\nURL: "${item.url}"`;

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
                // History items are not bookmarks, so create a bookmark first
                try {
                  await chrome.bookmarks.create({
                    title: item.title,
                    url: item.url,
                  });

                  // Add tags to the newly created bookmark
                  await addBookmarkTag({
                    url: item.url,
                    tags: generatedTags
                  });

                  setGenerationStatusMessage(t('bookmarks.tagGenerateSuccess', { count: generatedTags.length }));
                  toast.success(t('bookmarks.tagGenerateSuccess', { count: generatedTags.length }));
                } catch (error) {
                  logger.error('Failed to create bookmark while saving generated tags', error);
                  toast.error(t('bookmarks.addError'));
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
            logger.error('Failed to generate tags', error);
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
      logger.error('Tag generation request failed', error);
      setGenerationStatusMessage(t('bookmarks.tagGenerateRetry'));
      toast.error(t('bookmarks.tagGenerateRetry'));
      setIsGeneratingTags(false);
      setTagGenerationAbortController(null);
      setTimeout(() => {
        setTagGenerationItem(null);
        setGenerationStatusMessage('');
      }, 2000);
    }
  }, [t, toast]);

  const handleCancelTagGeneration = useCallback(() => {
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
  }, [tagGenerationAbortController, t]);

  const itemActions = useCallback((item: HistoryItem) => [{
    label: t('history.addBookmark'),
    icon: 'bookmark_add',
    onClick: () => handleOpenBookmarkModal(item),
  }, {
    label: t('bookmarks.generateTags'),
    icon: 'auto_awesome',
    onClick: () => handleGenerateTags(item),
  }, {
    label: t('common.delete'),
    icon: 'delete',
    onClick: () => handleDeleteSingleItem(item.url),
  }], [t, handleOpenBookmarkModal, handleGenerateTags, handleDeleteSingleItem]);

  const handleCancelSelection = useCallback(() => {
    setIsMultiSelectMode(false);
    setSelectedItems([]);
  }, []);

  const historyActions: ActionItem[] = [
    {
      label: t('history.deleteSelected'),
      onClick: handleDeleteSelected,
      className: 'text-error hover:opacity-80',
    },
  ];

  return (
    <div className="p-8 h-full flex flex-col relative nb-bg">
      {/* 装饰性背景元素 */}
      <div className="absolute top-20 right-16 w-20 h-20 bg-[color:var(--nb-accent-blue)]/15 border-3 border-[color:var(--nb-border)] nb-sticker-2 nb-float pointer-events-none shadow-[4px_4px_0px_0px_var(--nb-border)]" style={{ borderRadius: '40% 60% 70% 30% / 40% 50% 60% 50%' }}></div>
      <div className="absolute bottom-32 left-8 w-16 h-16 bg-[color:var(--nb-accent-pink)]/15 border-2 border-[color:var(--nb-border)] rounded-full nb-float pointer-events-none shadow-[3px_3px_0px_0px_var(--nb-border)]"></div>

      <header className="nb-card-static sticky top-0 z-20 -mx-8 -mt-8 px-8 pt-8 pb-5 shadow-[0_6px_0px_0px_var(--nb-border)] relative overflow-hidden">
        {/* 顶部装饰条 */}
        <div className="absolute top-0 left-0 right-0 flex h-1">
          <div className="flex-1 bg-[color:var(--nb-accent-pink)]"></div>
          <div className="flex-1 bg-[color:var(--nb-accent-yellow)]"></div>
          <div className="flex-1 bg-[color:var(--nb-accent-blue)]"></div>
          <div className="flex-1 bg-[color:var(--nb-accent-green)]"></div>
        </div>

        <div className="flex items-center justify-between">
          <DateNavigator onDateChange={handleDateChange} availableDates={availableDates} />
          <div className="flex items-center space-x-3">
            <div className="w-64">
              <UnifiedSearchBar
                mode="history"
                value={filters.search}
                onChange={value => setFilters(prev => ({...prev, search: value}))}
                placeholder={t('search.placeholder')}
                loading={isLoading}
              />
            </div>
            {/* Neo-Brutalism 风格网格选择器 */}
            <div className="nb-card-static flex items-center space-x-2 px-3 py-2.5 shadow-[3px_3px_0px_0px_var(--nb-border)]">
              <div className="w-7 h-7 flex items-center justify-center bg-[color:var(--nb-accent-blue)] border-2 border-[color:var(--nb-border)]">
                <span className="material-symbols-outlined icon-linear text-sm nb-text">grid_view</span>
              </div>
              <select
                value={cardsPerRow}
                onChange={(e) => {
                  const newValue = parseCardsPerRowValue(e.target.value);
                  if (newValue === null) return;
                  setCardsPerRow(newValue);
                  cardsPerRowStorage.set(newValue);
                  window.dispatchEvent(new CustomEvent('cardsPerRowChanged', { detail: newValue }));
                }}
                className="text-sm font-bold border-0 bg-transparent focus:outline-none focus:ring-0 cursor-pointer nb-text uppercase tracking-wide"
              >
                <option value="2">{t('settings.cardsPerRowOption', { count: 2 })}</option>
                <option value="3">{t('settings.cardsPerRowOption', { count: 3 })}</option>
                <option value="4">{t('settings.cardsPerRowOption', { count: 4 })}</option>
                <option value="5">{t('settings.cardsPerRowOption', { count: 5 })}</option>
                <option value="6">{t('settings.cardsPerRowOption', { count: 6 })}</option>
              </select>
            </div>
            {/* Neo-Brutalism 风格选择按钮 */}
            <button
              onClick={() => setIsMultiSelectMode(!isMultiSelectMode)}
              className={`nb-btn px-5 py-2.5 text-sm transition ${
                isMultiSelectMode
                  ? 'nb-btn-primary'
                  : 'nb-btn-secondary'
              }`}
            >
              <span className="material-symbols-outlined text-base mr-1.5">checklist</span>
              {isMultiSelectMode ? t('common.cancel') : t('common.select')}
            </button>
          </div>
        </div>
      </header>
      
      <main ref={mainContentRef} className="flex-1 overflow-y-auto pt-6 -mx-6 px-6">
        {isLoading && historyItems.length === 0 ? (
          <div className="space-y-1">
            {[...Array(10)].map((_, i) => (
              <HistoryItemSkeleton key={i} />
            ))}
          </div>
        ) : historyItems.length > 0 ? (
          <div className="space-y-8">
            {Object.entries(groupedHistory).sort(([a], [b]) => b.localeCompare(a)).map(([timeKey, items]) => {
              const isAllMode = filters.startTime === 0;
              const displayTitle = isAllMode 
                ? (() => {
                    const [dateStr, hourStr] = timeKey.split(' ');
                    const date = new Date(dateStr);
                    const today = new Date();
                    const yesterday = new Date(today);
                    yesterday.setDate(today.getDate() - 1);
                    
                    let dateLabel;
                    if (format(date, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd')) {
                      dateLabel = t('time.today');
                    } else if (format(date, 'yyyy-MM-dd') === format(yesterday, 'yyyy-MM-dd')) {
                      dateLabel = t('time.yesterday');
                    } else {
                      dateLabel = format(date, 'MMM dd, yyyy');
                    }
                    return `${dateLabel} ${hourStr}`;
                  })()
                : timeKey;
              
              return (
                <div key={timeKey}>
                  {/* Neo-Brutalism 风格时间组标题 */}
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 flex items-center justify-center bg-[color:var(--nb-accent-yellow)] border-3 border-[color:var(--nb-border)] shadow-[3px_3px_0px_0px_var(--nb-border)]">
                      <span className="material-symbols-outlined text-lg nb-text">schedule</span>
                    </div>
                    <h3 className="font-black nb-text text-xl uppercase tracking-tight">{displayTitle}</h3>
                    <div className="flex-1 h-0.5 bg-[color:var(--nb-border)]/30"></div>
                    <span className="px-3 py-1 bg-[color:var(--nb-accent-blue)]/30 border-2 border-[color:var(--nb-border)] text-xs font-bold nb-text uppercase">
                      {items.length} {t('common.items')}
                    </span>
                  </div>
                  <div className={getGridClass()}>
                    {items.map(item => (
                      <ItemCard
                        key={item.url}
                        href={item.url}
                        title={item.title}
                        hostname={getUrlHostname(item.url)}
                        faviconUrl={getFaviconUrl(item.url)}
                        actions={itemActions(item)}
                        visitCount={item.visitCount}
                        timeLabel={format(new Date(item.lastVisitTime), 'p')}
                        isMultiSelectMode={isMultiSelectMode}
                        isSelected={selectedItems.includes(item.url)}
                        onSelect={() => toggleSelection(item.url)}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
             {isLoading && historyItems.length > 0 && (
                <p className="text-center nb-text-secondary py-4">{t('common.loading')}</p>
            )}
          </div>
        ) : (
          <p className="text-center nb-text-secondary pt-16">{t('history.empty')}</p>
        )}
      </main>

      <SelectionActionBar
        selectionCount={selectedItems.length}
        actions={historyActions}
        onCancel={handleCancelSelection}
      />

      <ConfirmDialog
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={t('common.delete')}
        cancelText={t('common.cancel')}
        danger={true}
      />
      
      <Modal isOpen={isBookmarkModalOpen} onClose={() => setIsBookmarkModalOpen(false)} title={t('modal.addBookmark')}>
        {itemToAddBookmark && (
          <AddBookmarkForm
            initialUrl={itemToAddBookmark.url}
            initialTitle={itemToAddBookmark.title}
            onSuccess={() => {
              setIsBookmarkModalOpen(false);
            }}
          />
        )}
      </Modal>

      {/* AI生成标签进度模态框 - Neo-Brutalism 风格 */}
      {tagGenerationItem && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 transition-colors">
          <div className="nb-card-static w-full max-w-md p-8">
            <h3 className="text-lg font-bold mb-4 text-[color:var(--nb-text)]">{t('bookmarks.generatingTags')}</h3>
            <p className="nb-text-secondary mb-4">{tagGenerationItem.title}</p>
            <div className="flex items-center justify-center py-6">
              {isGeneratingTags ? (
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-[color:var(--nb-border)]/30 border-t-[color:var(--nb-accent-yellow)]"></div>
              ) : (
                <span className="material-symbols-outlined text-6xl text-[color:var(--nb-accent-green)]">check_circle</span>
              )}
            </div>
            <p className="text-center text-[color:var(--nb-text)] mb-6">{generationStatusMessage}</p>
            <div className="flex justify-end space-x-4">
              {isGeneratingTags && (
                <button
                  onClick={handleCancelTagGeneration}
                  className="nb-btn nb-btn-secondary px-5 py-2"
                >
                  {t('common.cancel')}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
