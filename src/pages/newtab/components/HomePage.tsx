import React, { useState, useRef, useEffect } from 'react';
import { RecommendationItem, WebCombo } from '../types';
import { timeAgo } from '../utils';
import { ItemCard } from './ItemCard';
import { Modal } from '../../../components/Modal';
import AddBookmarkForm from './AddBookmarkForm';
import WebComboForm from './WebComboForm';
import WebComboCard from './WebComboCard';
import { v4 as uuidv4 } from 'uuid';
import UnifiedSearchBar from '../../../components/UnifiedSearchBar';
import { useGlobalSearch } from '../../../hooks/useGlobalSearch';
import { SearchResultItem } from '../../../types/search';
import { getAllBookmarkTags, addBookmarkTag } from '../../../db/indexedDB';
import { buildTagGenerationPrompt } from '../../../lib/tagGenerationPrompts';
import { sendMessage } from '../../../services/llmService';
import { useToastContext } from '../../../contexts/ToastContext';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useClickOutside } from '../../../hooks/useClickOutside';
import { useTranslation } from 'react-i18next';

// Sortable Card wrapper
interface SortableCardProps {
  id: string;
  item: RecommendationItem | SearchResultItem;
  actions: any[];
}

const SortableCard: React.FC<SortableCardProps> = ({ id, item, actions }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isSearchResult = 'type' in item;
  const url = item.url!;
  const title = item.title!;
  const hostname = url ? new URL(url).hostname : '';
  const faviconUrl = isSearchResult
    ? `https://www.google.com/s2/favicons?domain=${hostname}&sz=32`
    : item.favicon;
  const visitCount = 'visitCount' in item ? item.visitCount : ('visitsInWindow' in item ? item.visitsInWindow : undefined);
  const timeLabel = isSearchResult
    ? timeAgo((item.type === 'history' ? item.lastVisitTime : item.dateAdded) || 0)
    : timeAgo(item.lastVisitTime);
  const tags = 'tags' in item ? (item.tags as string[]) : undefined;
  const itemType = isSearchResult ? item.type : undefined;

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <ItemCard
        href={url}
        title={title}
        hostname={hostname}
        faviconUrl={faviconUrl}
        visitCount={visitCount}
        timeLabel={timeLabel}
        tags={tags}
        actions={actions}
        type={itemType}
        isDraggable={true}
        dragHandleProps={listeners}
        isDragging={isDragging}
      />
    </div>
  );
};

interface HomePageProps {
  recommendations: RecommendationItem[];
  timeRange: string;
  onRefresh?: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({ recommendations, timeRange, onRefresh }) => {
  const { t } = useTranslation();
  const toast = useToastContext();
  const [noMoreDisplayed, setNoMoreDisplayed] = useState<string[]>(() => {
    const stored = localStorage.getItem('noMoreDisplayed');
    return stored ? JSON.parse(stored) : [];
  });
  const [searchTerm, setSearchTerm] = useState('');
  const { results: searchResults, loading: searchLoading } = useGlobalSearch(searchTerm);

  const [isBookmarkModalOpen, setIsBookmarkModalOpen] = useState(false);
  const [itemToAddBookmark, setItemToAddBookmark] = useState<RecommendationItem | SearchResultItem | null>(null);
  const [clipboardItems, setClipboardItems] = useState<RecommendationItem[]>([]);

  // AI生成标签相关状态
  const [isGeneratingTags, setIsGeneratingTags] = useState(false);
  const [tagGenerationItem, setTagGenerationItem] = useState<RecommendationItem | SearchResultItem | null>(null);
  const [generationStatusMessage, setGenerationStatusMessage] = useState('');
  const [tagGenerationAbortController, setTagGenerationAbortController] = useState<AbortController | null>(null);

  // Cards per row setting
  const [cardsPerRow, setCardsPerRow] = useState<number>(() => {
    const saved = localStorage.getItem('cardsPerRow');
    return saved ? parseInt(saved, 10) : 4;
  });

  // Item order state
  const [itemOrder, setItemOrder] = useState<string[]>(() => {
    const stored = localStorage.getItem('homeItemOrder');
    return stored ? JSON.parse(stored) : [];
  });

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Web Combo state
  const [webCombos, setWebCombos] = useState<WebCombo[]>(() => {
    const stored = localStorage.getItem('webCombos');
    return stored ? JSON.parse(stored) : [];
  });
  const [isComboModalOpen, setIsComboModalOpen] = useState(false);
  const [editingCombo, setEditingCombo] = useState<WebCombo | null>(null);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  useClickOutside(moreMenuRef, () => setShowMoreMenu(false));

  useEffect(() => {
    const checkClipboard = async () => {
      try {
        const text = await navigator.clipboard.readText();
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        const urls = text.match(urlRegex);

        if (urls) {
          const newItems: RecommendationItem[] = urls.map(url => ({
            url: url,
            title: url.length > 20 ? url.substring(0, 20) + '...' : url,
            favicon: `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=32`,
            lastVisitTime: Date.now(),
            visits: [],
            visitsInWindow: 1,
            isBookmark: false,
            tags: [],
          }));
          setClipboardItems(newItems);
        }
        // On success, remove the listener to avoid re-checking
        window.removeEventListener('focus', checkClipboard);
      } catch (err) {
        if (err instanceof Error && err.name === 'NotAllowedError') {
          console.log('Waiting for document focus to read clipboard.');
        } else {
          console.error('Failed to read clipboard contents: ', err);
        }
      }
    };

    window.addEventListener('focus', checkClipboard);
    checkClipboard(); // Initial attempt

    return () => {
      window.removeEventListener('focus', checkClipboard);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem('webCombos', JSON.stringify(webCombos));
  }, [webCombos]);

  // Listen for cardsPerRow changes (from same tab or different tabs)
  useEffect(() => {
    const handleStorageChange = () => {
      const saved = localStorage.getItem('cardsPerRow');
      if (saved) {
        setCardsPerRow(parseInt(saved, 10));
      }
    };

    const handleCustomEvent = (e: Event) => {
      const customEvent = e as CustomEvent;
      setCardsPerRow(customEvent.detail);
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

  // Get grid columns class based on cardsPerRow
  const getGridClass = () => {
    const baseClass = 'grid gap-6 transition-all duration-300';
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

  // Handle drag end
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = sortedAllItems.findIndex((item) => item.url === active.id);
      const newIndex = sortedAllItems.findIndex((item) => item.url === over.id);

      const newItems = arrayMove(sortedAllItems, oldIndex, newIndex);
      const newOrder = newItems.map((item) => item.url);
      setItemOrder(newOrder);
      localStorage.setItem('homeItemOrder', JSON.stringify(newOrder));
    }
  };

  const handleAddToNoMoreDisplayed = (url: string) => {
    const updatedList = [...noMoreDisplayed, url];
    setNoMoreDisplayed(updatedList);
    localStorage.setItem('noMoreDisplayed', JSON.stringify(updatedList));
  };

  const handleOpenBookmarkModal = (item: RecommendationItem | SearchResultItem) => {
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
    if (window.confirm(t('home.deleteWebComboConfirm'))) {
        setWebCombos(webCombos.filter(c => c.id !== id));
    }
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

  const handleGenerateTags = async (item: RecommendationItem | SearchResultItem) => {
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
      const userMessage = t('tagGeneration.promptTemplate', { title: item.title, url: item.url });

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
                // Check if item is already a bookmark
                const isBookmark = 'type' in item ? item.type === 'bookmark' : item.isBookmark;

                if (!isBookmark) {
                  // Create bookmark first, then add tags
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
                    // 刷新推荐列表以显示新标签
                    onRefresh?.();
                  } catch (error) {
                    console.error('创建书签失败:', error);
                    toast.error(t('bookmarks.addError'));
                  }
                } else {
                  // Item is already a bookmark, just add tags
                  await addBookmarkTag({
                    url: item.url,
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

  const itemActions = (item: RecommendationItem | SearchResultItem) => {
    const actions = [];

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

  const filteredRecommendations = recommendations.filter(item => !noMoreDisplayed.includes(item.url));

  const allItems = [...clipboardItems, ...filteredRecommendations];

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
    <div className="p-10 relative">
      <div className="absolute top-10 right-10 flex items-center space-x-4">
          <div className="w-64">
            <UnifiedSearchBar
              mode="global"
              value={searchTerm}
              onChange={setSearchTerm}
              loading={searchLoading}
              placeholder={t('home.searchPlaceholder')}
            />
          </div>

          {/* Cards per row quick selector - Neo-Brutalism 风格 */}
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
              className="text-sm border-0 bg-transparent focus:outline-none focus:ring-0 cursor-pointer pr-6 text-[color:var(--nb-text)]"
              style={{ backgroundPosition: 'right 0.25rem center', backgroundSize: '1rem' }}
            >
              <option value="2">{t('settings.cardsPerRowOption', { count: 2 })}</option>
              <option value="3">{t('settings.cardsPerRowOption', { count: 3 })}</option>
              <option value="4">{t('settings.cardsPerRowOption', { count: 4 })}</option>
              <option value="5">{t('settings.cardsPerRowOption', { count: 5 })}</option>
              <option value="6">{t('settings.cardsPerRowOption', { count: 6 })}</option>
            </select>
          </div>

          <div className="relative" ref={moreMenuRef}>
              <button onClick={() => setShowMoreMenu(!showMoreMenu)} className="nb-btn-ghost p-2 rounded-full transition">
                  <span className="material-symbols-outlined icon-linear text-lg">more_vert</span>
              </button>
              {showMoreMenu && (
                  <div className="nb-card-static absolute right-0 mt-2 w-48 z-10">
                      <div className="py-1">
                          <div
                              onClick={handleOpenCreateComboModal}
                              className="flex items-center px-4 py-2 text-sm text-[color:var(--nb-text)] hover:bg-[color:var(--nb-accent-yellow)]/20 cursor-pointer transition"
                          >
                              {t('home.createWebCombo')}
                          </div>
                      </div>
                  </div>
              )}
          </div>
      </div>

      {searchTerm ? (
        <div className="mt-12">
          <h2 className="text-xl font-bold text-main mb-6">{t('home.searchResults')}</h2>
          <div className={getGridClass()}>
            {searchResults.map(item => (
              <ItemCard
                key={item.type === 'history' ? item.url! : item.id}
                href={item.url!}
                title={item.title!}
                hostname={item.url ? new URL(item.url).hostname : ''}
                faviconUrl={`https://www.google.com/s2/favicons?domain=${item.url ? new URL(item.url).hostname : ''}&sz=32`}
                visitCount={'visitCount' in item ? item.visitCount : undefined}
                timeLabel={timeAgo((item.type === 'history' ? item.lastVisitTime : item.dateAdded) || 0)}
                tags={'tags' in item ? (item.tags as string[]) : undefined}
                actions={itemActions(item)}
                type={item.type}
              />
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="mb-10">
            <div className="flex items-center mb-2">
              <span className="material-symbols-outlined text-main mr-3 icon-linear">schedule</span>
              <h2 className="text-xl font-bold text-main">{t('home.momentsInHistory')}</h2>
            </div>
            <p className="text-secondary ml-9">
              {t('home.momentsDescription')}
              <span className="block font-mono text-xs mt-1">{timeRange}</span>
            </p>
          </div>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={sortedAllItems.map(item => item.url)}
              strategy={rectSortingStrategy}
            >
              <div className={getGridClass()}>
                {sortedAllItems.map(item => (
                  <SortableCard
                    key={item.url}
                    id={item.url}
                    item={item}
                    actions={itemActions(item)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
          
          {webCombos.length > 0 && (
            <div className="mt-12">
                <div className="mb-10">
                    <div className="flex items-center mb-2">
                      <span className="material-symbols-outlined nb-text mr-3 icon-linear">collections_bookmark</span>
                      <h2 className="text-xl font-bold nb-text">{t('home.webCombos')}</h2>
                    </div>
                </div>
                <div className={getGridClass()}>
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
          <AddBookmarkForm
            initialUrl={itemToAddBookmark.url!}
            initialTitle={itemToAddBookmark.title!}
            onSuccess={() => {
              setIsBookmarkModalOpen(false);
            }}
          />
        )}
      </Modal>

      <Modal isOpen={isComboModalOpen} onClose={() => setIsComboModalOpen(false)} title={editingCombo ? t('home.editWebCombo') : t('home.createWebCombo')}>
        <WebComboForm
            combo={editingCombo}
            onSave={handleSaveCombo}
            onCancel={() => {
                setIsComboModalOpen(false);
                setEditingCombo(null);
            }}
        />
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
  )
};
