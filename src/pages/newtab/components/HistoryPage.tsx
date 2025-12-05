import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useEnhancedHistory } from '../hooks/useEnhancedHistory';
import { HistoryItem } from '../types';
import { ItemCard } from './ItemCard';
import { DateNavigator } from '../../../components/DateNavigator';
import { SelectionActionBar, ActionItem } from '../../../components/SelectionActionBar';
import { format, startOfDay, endOfDay, setHours } from 'date-fns';
import { Modal } from '../../../components/Modal';
import AddBookmarkForm from './AddBookmarkForm';
import UnifiedSearchBar from '../../../components/UnifiedSearchBar';
import { HistoryItemSkeleton } from '../../../components/SkeletonLoader';
import { ConfirmDialog } from '../../../components/ConfirmDialog';
import { useToastContext } from '../../../contexts/ToastContext';
import { useTranslation } from 'react-i18next';
import { getAllBookmarkTags, addBookmarkTag } from '../../../db/indexedDB';
import { buildTagGenerationPrompt } from '../../../lib/tagGenerationPrompts';
import { sendMessage } from '../../../services/llmService';

const getFaviconUrl = (url: string) => `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=32`;

export const HistoryPage: React.FC = () => {
  const { t } = useTranslation();
  const {
    historyItems,
    devices,
    isLoading,
    filters,
    setFilters,
    deleteHistoryByUrl,
    deleteHistoryByDateRange,
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
  const [cardsPerRow, setCardsPerRow] = useState<number>(() => {
    const saved = localStorage.getItem('cardsPerRow');
    return saved ? parseInt(saved, 10) : 4;
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
      const customEvent = e as CustomEvent;
      setCardsPerRow(customEvent.detail);
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
  
  const handleHourChange = useCallback((hour: number) => {
    const currentStartDate = new Date(filters.startTime);
    const newStart = setHours(currentStartDate, hour);
    const newEnd = new Date(newStart.getTime() + 60 * 60 * 1000 - 1);
    setFilters(prev => ({ ...prev, startTime: newStart.getTime(), endTime: newEnd.getTime() }));
  }, [filters.startTime, setFilters]);

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

      const messages = [
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
            // 移除代码块标记
            const unwrapped = generatedContent.replace(/```(?:\w+)?\s*([\s\S]*?)```/g, '$1').trim();

            if (unwrapped) {
              const generatedTags = unwrapped
                .split(',')
                .map(tag => tag.trim())
                .filter(tag => tag.length > 0);

              if (generatedTags.length > 0) {
                // History items are not bookmarks, so create a bookmark first
                try {
                  const newBookmark = await chrome.bookmarks.create({
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
                  console.error('创建书签失败:', error);
                  toast.error(t('bookmarks.addError'));
                }
              } else {
                setGenerationStatusMessage(t('bookmarks.tagGenerateFailed'));
                toast.error(t('bookmarks.tagGenerateFailed'));
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
            console.error('生成标签失败:', error);
            setGenerationStatusMessage(t('bookmarks.tagGenerateError', { message: error.message }));
            toast.error(t('bookmarks.tagGenerateError', { message: error.message }));
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
      console.error('生成标签出错:', error);
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
    <div className="p-6 h-full flex flex-col">
      <header className="nb-bg nb-border nb-shadow sticky top-0 z-20 -mx-6 -mt-6 px-6 pt-6 pb-4 rounded-b-xl">
        <div className="flex items-center justify-between">
          <DateNavigator onDateChange={handleDateChange} availableDates={availableDates} />
          <div className="flex items-center space-x-2">
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
            <div className="nb-card-static flex items-center space-x-2 px-3 py-2">
              <span className="material-symbols-outlined icon-linear text-sm text-[color:var(--nb-text)]">grid_view</span>
              <select
                value={cardsPerRow}
                onChange={(e) => {
                  const newValue = parseInt(e.target.value, 10);
                  setCardsPerRow(newValue);
                  localStorage.setItem('cardsPerRow', newValue.toString());
                  window.dispatchEvent(new CustomEvent('cardsPerRowChanged', { detail: newValue }));
                }}
                className="text-sm border-0 bg-transparent focus:outline-none focus:ring-0 cursor-pointer text-[color:var(--nb-text)]"
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
              className={`nb-btn px-4 py-2 text-sm font-semibold transition ${
                isMultiSelectMode
                  ? 'nb-btn-primary'
                  : 'nb-btn-secondary'
              }`}
            >
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
                  <h3 className="font-bold text-main mb-4 text-lg">{displayTitle}</h3>
                  <div className={getGridClass()}>
                    {items.map(item => (
                      <ItemCard
                        key={item.url}
                        href={item.url}
                        title={item.title}
                        hostname={new URL(item.url).hostname}
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
                <p className="text-center text-secondary py-4">{t('common.loading')}</p>
            )}
          </div>
        ) : (
          <p className="text-center text-secondary pt-16">{t('history.empty')}</p>
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
            <p className="text-secondary mb-4">{tagGenerationItem.title}</p>
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
