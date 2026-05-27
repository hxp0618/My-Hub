import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useBookmarks } from '../hooks/useBookmarks';
import { useBookmarkDisplay } from '../hooks/useBookmarkDisplay';
import { useBookmarkOrganization } from '../hooks/useBookmarkOrganization';
import { useBookmarkTagGeneration } from '../hooks/useBookmarkTagGeneration';
import { useBulkTagRegeneration } from '../hooks/useBulkTagRegeneration';
import { EnhancedBookmark } from '../../../types/bookmarks';
import { SortOrder } from '../types';
import { BookmarkFolderTree } from './BookmarkFolderTree';
import { SelectionActionBar, ActionItem } from '../../../components/SelectionActionBar';
import { AutoOrganizeModal } from './AutoOrganizeModal';
import { OrganizeBookmarksModal } from '../../../components/OrganizeBookmarksModal';
import { OrganizeProgressModal } from '../../../components/OrganizeProgressModal';
import { BookmarkTreeSkeleton } from '../../../components/SkeletonLoader';
import { useClickOutside } from '../../../hooks/useClickOutside';
import { ConfirmDialog } from '../../../components/ConfirmDialog';
import { useToastContext } from '../../../contexts/ToastContext';
import { useTranslation } from 'react-i18next';
import { Modal } from '../../../components/Modal';
import AddBookmarkForm from './AddBookmarkForm';
import { BookmarkEditModal } from './BookmarkEditModal';
import { BookmarkMainContent } from './BookmarkPageContent';
import {
  AddTagsModal,
  DeduplicateModal,
  MoveBookmarksModal,
  ReorderConfirmModal,
} from './BookmarkPageDialogs';
import { findFolder } from '../../../utils/bookmarkUtils';
import { BookmarkHealthIssue } from '../../../utils/bookmarkHealth';
import { BulkTagRegenerationModal } from '../../../components/BulkTagRegenerationModal';
import { createLogger } from '../../../utils/logger';
import {
  bookmarkSidebarCollapsed,
  cardsPerRow as cardsPerRowStorage,
  parseCardsPerRowValue,
  type StorageValues,
  StorageKey,
} from '../../../utils/storageManager';

const logger = createLogger('[BookmarkPage]');

export const BookmarkPage: React.FC = () => {
  const { t } = useTranslation();
  const {
    bookmarks,
    loading,
    deleteBookmark,
    updateBookmark,
    updateBookmarkTags,
    sortOrder,
    updateSortOrder,
    createFolder,
    renameFolder,
    deleteFolder,
    moveBookmark,
    isMultiSelectMode,
    selectedBookmarkIds,
    toggleMultiSelectMode,
    toggleBookmarkSelection,
    moveBookmarks,
    addTagsToBookmarks,
    deleteBookmarks,
    reorderBookmarksInChrome,
    isBulkUpdating,
    refreshBookmarks,
    applyBookmarkOrganization,
    applyBookmarkOrganizationBatch,
    lastDeletedBookmarkId,
    deletedBookmarkContext,
    clearLastDeletedBookmarkId
  } = useBookmarks();

  const toast = useToastContext();
  const [selectedFolderId, setSelectedFolderId] = useState('1'); // '1' is usually the bookmarks bar
  const [searchTerm, setSearchTerm] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<{ isOpen: boolean; id?: string; isBulk?: boolean; count?: number }>({ isOpen: false });
  const [editingItem, setEditingItem] = useState<EnhancedBookmark | null>(null);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  useClickOutside(moreMenuRef, () => setShowMoreMenu(false));

  // Cards per row setting (global)
  const [cardsPerRow, setCardsPerRow] = useState<StorageValues[StorageKey.CARDS_PER_ROW]>(() => {
    return cardsPerRowStorage.get();
  });
  const [isAddBookmarkModalOpen, setIsAddBookmarkModalOpen] = useState(false);
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [isAddTagsModalOpen, setIsAddTagsModalOpen] = useState(false);
  const [showReorderConfirm, setShowReorderConfirm] = useState(false);
  const [isAutoOrganizeModalOpen, setIsAutoOrganizeModalOpen] = useState(false);
  const [organizeMenuOpen, setOrganizeMenuOpen] = useState(false);
  const organizeMenuRef = useRef<HTMLDivElement>(null);
  useClickOutside(organizeMenuRef, () => setOrganizeMenuOpen(false));

  // 文件夹栏折叠状态 - 使用统一存储入口，避免脏配置影响布局。
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    return bookmarkSidebarCollapsed.get();
  });

  const toggleSidebar = () => {
    const newState = !isSidebarCollapsed;
    setIsSidebarCollapsed(newState);
    bookmarkSidebarCollapsed.set(newState);
  };

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

  const {
    isOrganizeModalOpen,
    isOrganizeProgressModalOpen,
    organizeProgress,
    organizeAbortController,
    isOrganizeAbortConfirmOpen,
    openOrganizeModal,
    closeOrganizeModal,
    handleOrganizeConfirm,
    handleOrganizeProgressClose,
    handleConfirmOrganizeAbort,
    closeOrganizeAbortConfirm,
  } = useBookmarkOrganization({
    bookmarks,
    applyBookmarkOrganizationBatch,
    refreshBookmarks,
  });

  // 去重相关状态
  const [isDeduplicateModalOpen, setIsDeduplicateModalOpen] = useState(false);
  const [duplicateBookmarks, setDuplicateBookmarks] = useState<{
    url: string;
    bookmarks: EnhancedBookmark[];
  }[]>([]);

  const {
    isGeneratingTags,
    currentTagGenerationTitle,
    generationStatusMessage,
    generateTags,
    cancelTagGeneration,
  } = useBookmarkTagGeneration();

  const {
    failureCount,
    isBulkRegenerationModalOpen,
    bulkRegenerationProgress,
    handleRegenerateAllTags,
    handleRetryFailedTags,
    handleCancelBulkRegeneration,
    handleCompleteBulkRegeneration,
  } = useBulkTagRegeneration(refreshBookmarks);
  const [activeHealthIssue, setActiveHealthIssue] = useState<BookmarkHealthIssue | null>(null);
  const {
    selectedFolder,
    healthReport,
    bookmarksToDisplay,
  } = useBookmarkDisplay({
    bookmarks,
    selectedFolderId,
    searchTerm,
    activeHealthIssue,
    sortOrder,
  });

  const handleGenerateTags = useCallback((item: EnhancedBookmark) => {
    void generateTags({
      title: item.title,
      url: item.url,
      displayTitle: item.title,
      onTagsGenerated: generatedTags => updateBookmarkTags(item.id, generatedTags),
      successMessage: generatedTags => t('bookmarks.tagGenerateSuccess', { count: generatedTags.length }),
      emptyMessage: t('bookmarks.tagGenerateFailed'),
      unexpectedErrorMessage: t('bookmarks.tagGenerateRetry'),
      onValidationError: message => toast.error(message),
      onSuccess: (_generatedTags, message) => toast.success(message),
      onEmpty: message => toast.error(message),
      onError: (_error, message) => toast.error(message),
    });
  }, [generateTags, t, toast, updateBookmarkTags]);

  const buildDragPayload = (bookmark: EnhancedBookmark) => ({
    type: 'bookmark' as const,
    id: bookmark.id,
    parentId: bookmark.parentId ?? null,
    title: bookmark.title,
  });

  const handleBookmarkDragStart = (
    event: React.DragEvent<HTMLDivElement>,
    bookmark: EnhancedBookmark
  ) => {
    if (isMultiSelectMode) {
      event.preventDefault();
      return;
    }
    const payload = buildDragPayload(bookmark);
    event.dataTransfer.setData('application/myhub-node', JSON.stringify(payload));
    if (bookmark.url) {
      event.dataTransfer.setData('text/uri-list', bookmark.url);
    }
    event.dataTransfer.effectAllowed = 'move';
  };

  const handleBookmarkDragEnd = () => {
    // no-op for now; kept for future visual feedback hooks
  };

  const handleAutoOrganizeModalClose = (refresh?: boolean) => {
    setIsAutoOrganizeModalOpen(false);
    if (refresh) {
      refreshBookmarks();
    }
  };

  // 检测重复书签
  const findDuplicateBookmarks = () => {
    const urlMap = new Map<string, EnhancedBookmark[]>();

    // 递归收集所有书签
    const collectBookmarks = (nodes: EnhancedBookmark[]) => {
      for (const node of nodes) {
        if (node.url) {
          const existing = urlMap.get(node.url) || [];
          urlMap.set(node.url, [...existing, node]);
        }
        if (node.children) {
          collectBookmarks(node.children);
        }
      }
    };

    collectBookmarks(bookmarks);

    // 找出重复的URL
    const duplicates: { url: string; bookmarks: EnhancedBookmark[] }[] = [];
    urlMap.forEach((bookmarkList, url) => {
      if (bookmarkList.length > 1) {
        duplicates.push({ url, bookmarks: bookmarkList });
      }
    });

    return duplicates;
  };

  // 开始去重流程
  const handleStartDeduplicate = () => {
    const duplicates = findDuplicateBookmarks();
    setDuplicateBookmarks(duplicates);
    setIsDeduplicateModalOpen(true);
    setShowMoreMenu(false);
  };

  // 执行去重
  const handleDeduplicateConfirm = async (bookmarksToDelete: string[]) => {
    try {
      await deleteBookmarks(bookmarksToDelete);
      toast.success(t('bookmarks.deduplicateSuccess', { count: bookmarksToDelete.length }));
      setIsDeduplicateModalOpen(false);
      setDuplicateBookmarks([]);
    } catch (error) {
      logger.error('Error deduplicating bookmarks', error);
      toast.error(t('bookmarks.deduplicateError'));
    }
  };

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const [key, order] = e.target.value.split('-') as [SortOrder['key'], SortOrder['order']];
    updateSortOrder({ key, order });
  };

  // 保存删除前的滚动位置
  const scrollPositionRef = useRef<number>(0);
  const isRestoringScrollRef = useRef<boolean>(false);

  // 删除书签后自动定位到相邻书签
  useEffect(() => {
    if (!lastDeletedBookmarkId || !deletedBookmarkContext) return;

    // 标记正在恢复滚动
    isRestoringScrollRef.current = true;

    // 等待数据加载完成和DOM更新
    const checkAndScroll = () => {
      // 如果还在加载中,继续等待
      if (loading) {
        setTimeout(checkAndScroll, 100);
        return;
      }

      // 查找所有书签卡片
      const bookmarkCards = Array.from(document.querySelectorAll('[data-bookmark-id]')) as HTMLElement[];

      if (bookmarkCards.length === 0) {
        // 还没有渲染完成,继续等待
        setTimeout(checkAndScroll, 100);
        return;
      }

      // 执行滚动恢复
      if (scrollPositionRef.current > 0) {
        // 策略1: 恢复到之前保存的滚动位置 (最可靠)
        window.scrollTo({
          top: scrollPositionRef.current,
          behavior: 'smooth'
        });
      } else {
        // 策略2: 使用索引定位
        const currentIndex = bookmarkCards.findIndex(
          card => card.getAttribute('data-bookmark-index') === String(deletedBookmarkContext.index)
        );

        let targetCard: HTMLElement | null = null;

        if (currentIndex >= 0 && currentIndex < bookmarkCards.length) {
          targetCard = bookmarkCards[currentIndex];
        } else if (currentIndex >= bookmarkCards.length && bookmarkCards.length > 0) {
          targetCard = bookmarkCards[bookmarkCards.length - 1];
        } else if (bookmarkCards.length > 0) {
          targetCard = bookmarkCards[0];
        }

        if (targetCard) {
          targetCard.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
          });
        }
      }

      // 清理状态
      clearLastDeletedBookmarkId();
      scrollPositionRef.current = 0;
      isRestoringScrollRef.current = false;
    };

    // 开始检查和滚动
    setTimeout(checkAndScroll, 150);

  }, [lastDeletedBookmarkId, deletedBookmarkContext, loading, clearLastDeletedBookmarkId]);
  
  const handleSelectHealthIssue = useCallback((issue: BookmarkHealthIssue) => {
    setActiveHealthIssue(current => current === issue ? null : issue);
    setSearchTerm('');
  }, []);

  const handleDelete = useCallback((id: string) => {
    setConfirmDelete({ isOpen: true, id, isBulk: false });
  }, []);

  const handleSaveEdit = useCallback(async (id: string, newTitle: string, newUrl: string, newTags: string[], newParentId: string) => {
    const originalItem = findFolder(bookmarks, id);
    if (!originalItem) return;

    // Update title/url if changed
    if (originalItem.title !== newTitle || originalItem.url !== newUrl) {
      await updateBookmark(id, { title: newTitle, url: newUrl });
    }

    // Update tags if changed
    const tagsChanged = JSON.stringify(originalItem.tags?.sort()) !== JSON.stringify(newTags.sort());
    if (tagsChanged) {
        await updateBookmarkTags(id, newTags);
    }

    // Move if folder changed
    if (originalItem.parentId !== newParentId) {
        await moveBookmark(id, newParentId);
    }
  }, [bookmarks, updateBookmark, updateBookmarkTags, moveBookmark]);

  const handleConfirmReorder = async () => {
    if (!selectedFolder || !selectedFolder.children) return;

    // 复制并排序子项目，文件夹优先
    const sortedChildren = [...selectedFolder.children].sort((a, b) => {
      const aIsFolder = !a.url;
      const bIsFolder = !b.url;

      if (aIsFolder && !bIsFolder) return -1;
      if (!aIsFolder && bIsFolder) return 1;

      // 如果两者都是文件夹或都是书签，则按当前排序规则排序
      const aVal = a[sortOrder.key] || 0;
      const bVal = b[sortOrder.key] || 0;

      if (aVal < bVal) return sortOrder.order === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder.order === 'asc' ? 1 : -1;
      
      return 0;
    });

    const reorderedIds = sortedChildren.map(item => item.id);
    await reorderBookmarksInChrome(reorderedIds);
    setShowReorderConfirm(false);
  };

  const handleBulkMove = useCallback(async (targetParentId: string) => {
    await moveBookmarks(selectedBookmarkIds, targetParentId);
    setIsMoveModalOpen(false);
    toggleMultiSelectMode(); // also clears selection
  }, [selectedBookmarkIds, moveBookmarks, toggleMultiSelectMode]);

  const handleBulkAddTags = useCallback(async (tags: string[]) => {
      if (tags.length > 0) {
          await addTagsToBookmarks(selectedBookmarkIds, tags);
      }
      setIsAddTagsModalOpen(false);
      toggleMultiSelectMode(); // also clears selection
  }, [selectedBookmarkIds, addTagsToBookmarks, toggleMultiSelectMode]);

  const handleBulkDelete = useCallback(() => {
    setConfirmDelete({ isOpen: true, isBulk: true, count: selectedBookmarkIds.length });
  }, [selectedBookmarkIds.length]);

  const bookmarkPageActions: ActionItem[] = [
    {
      label: t('bookmarks.moveTo'),
      onClick: () => setIsMoveModalOpen(true),
      className: "nb-text hover:nb-text",
      disabled: selectedBookmarkIds.length === 0,
    },
    {
      label: t('bookmarks.addTags'),
      onClick: () => setIsAddTagsModalOpen(true),
      className: "nb-text hover:nb-text",
      disabled: selectedBookmarkIds.length === 0,
    },
    {
      label: t('common.delete'),
      onClick: handleBulkDelete,
      className: 'text-[color:var(--nb-accent-pink)] hover:opacity-80',
      disabled: selectedBookmarkIds.length === 0,
    },
  ];
  const activeHealthTitle = activeHealthIssue ? t(`bookmarks.health.filters.${activeHealthIssue}`) : null;
  const headerTitle = isMultiSelectMode
    ? t('bookmarks.selectedCount', { count: selectedBookmarkIds.length })
    : activeHealthTitle || (searchTerm ? t('bookmarks.searchResults', { term: searchTerm }) : selectedFolder?.title || t('bookmarks.title'));

  const bookmarkActions = useCallback((item: EnhancedBookmark) => [
    {
      label: t('common.edit'),
      icon: 'edit',
      onClick: () => setEditingItem(item),
    },
    {
      label: t('bookmarks.generateTags'),
      icon: 'auto_awesome',
      onClick: () => handleGenerateTags(item),
    },
    {
      label: t('common.delete'),
      icon: 'delete',
      onClick: () => handleDelete(item.id),
    },
  ], [t, handleDelete, handleGenerateTags]);

  if (loading) {
    return (
      <div className="flex-1 p-4">
        <BookmarkTreeSkeleton />
      </div>
    );
  }

  return (
    <div className="flex h-full gap-4 pl-6 nb-bg nb-text">
      <aside className={`transition-all duration-300 ease-in-out h-full nb-card-static relative z-20 overflow-y-auto pt-6 px-4 ${
        isSidebarCollapsed ? 'w-0 p-0 border-0 shadow-none overflow-hidden' : 'w-1/5 min-w-[200px] max-w-[260px]'
      }`}>
        {!isSidebarCollapsed && (
          <>
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-base font-bold nb-text">{t('bookmarks.folders')}</h2>
                <div className="relative" ref={organizeMenuRef}>
                    <button onClick={() => setOrganizeMenuOpen(!organizeMenuOpen)} className="nb-btn nb-btn-ghost p-1 rounded-md">
                        <span className="material-symbols-outlined icon-linear text-lg">more_horiz</span>
                    </button>
                    {organizeMenuOpen && (
                        <div className="nb-dropdown absolute right-0 mt-2 w-48 z-10">
                            <div className="py-1">
                                <div
                                    onClick={() => {
                                        setIsAutoOrganizeModalOpen(true);
                                        setOrganizeMenuOpen(false);
                                    }}
                                    className="nb-dropdown-item flex items-center gap-3 text-sm font-medium cursor-pointer"
                                >
                                    {t('bookmarks.aiGenerateFolderStructure')}
                                </div>
                                <div
                                    onClick={() => {
                                        openOrganizeModal();
                                        setOrganizeMenuOpen(false);
                                    }}
                                    className="nb-dropdown-item flex items-center gap-3 text-sm font-medium cursor-pointer"
                                >
                                    {t('bookmarks.aiOrganizeBookmarks')}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            <BookmarkFolderTree
              nodes={bookmarks}
              selectedFolderId={selectedFolderId}
              onSelectFolder={setSelectedFolderId}
              createFolder={createFolder}
              renameFolder={renameFolder}
              deleteFolder={deleteFolder}
              moveFolder={moveBookmark}
              moveBookmark={moveBookmark}
              onDropComplete={refreshBookmarks}
            />
          </>
        )}
      </aside>
      
      <BookmarkMainContent
        headerTitle={headerTitle}
        isSidebarCollapsed={isSidebarCollapsed}
        isMultiSelectMode={isMultiSelectMode}
        searchTerm={searchTerm}
        loading={loading}
        sortOrder={sortOrder}
        cardsPerRow={cardsPerRow}
        showMoreMenu={showMoreMenu}
        moreMenuRef={moreMenuRef}
        activeHealthIssue={activeHealthIssue}
        failureCount={failureCount}
        healthReport={healthReport}
        bookmarksToDisplay={bookmarksToDisplay}
        selectedBookmarkIds={selectedBookmarkIds}
        getBookmarkActions={bookmarkActions}
        onToggleSidebar={toggleSidebar}
        onClearHealthIssue={() => setActiveHealthIssue(null)}
        onRetryFailedTags={handleRetryFailedTags}
        onAddBookmark={() => setIsAddBookmarkModalOpen(true)}
        onSearchTermChange={(value) => {
          setSearchTerm(value);
          setActiveHealthIssue(null);
        }}
        onSortChange={handleSortChange}
        onCardsPerRowChange={setCardsPerRow}
        onToggleMoreMenu={() => setShowMoreMenu(!showMoreMenu)}
        onCloseMoreMenu={() => setShowMoreMenu(false)}
        onToggleMultiSelectMode={toggleMultiSelectMode}
        onRegenerateAllTags={handleRegenerateAllTags}
        onStartDeduplicate={handleStartDeduplicate}
        onOpenReorderConfirm={() => setShowReorderConfirm(true)}
        onSelectHealthIssue={handleSelectHealthIssue}
        onToggleBookmarkSelection={toggleBookmarkSelection}
        onBookmarkDragStart={handleBookmarkDragStart}
        onBookmarkDragEnd={handleBookmarkDragEnd}
      />

      {editingItem && (
        <BookmarkEditModal
            item={editingItem} 
            onClose={() => setEditingItem(null)} 
            onSave={handleSaveEdit}
        />
      )}

      {isMoveModalOpen && <MoveBookmarksModal onClose={() => setIsMoveModalOpen(false)} onMove={handleBulkMove} />}
      {isAddTagsModalOpen && <AddTagsModal onClose={() => setIsAddTagsModalOpen(false)} onSave={handleBulkAddTags} />}
      
      {showReorderConfirm && (() => {
        const sortOrderOptions: { [key: string]: string } = {
            'dateAdded-desc': t('bookmarks.sortByDateAddedDesc'),
            'dateAdded-asc': t('bookmarks.sortByDateAddedAsc'),
            'dateLastUsed-desc': t('bookmarks.sortByDateLastUsedDesc'),
            'dateLastUsed-asc': t('bookmarks.sortByDateLastUsedAsc'),
            'title-asc': t('bookmarks.sortByNameAsc'),
            'title-desc': t('bookmarks.sortByNameDesc'),
        };
        const currentSortText = sortOrderOptions[`${sortOrder.key}-${sortOrder.order}`];

        return (
            <ReorderConfirmModal
                onClose={() => setShowReorderConfirm(false)}
                onConfirm={handleConfirmReorder}
                sortOrderText={currentSortText}
                isLoading={isBulkUpdating}
            />
        )
      })()}

      {isAutoOrganizeModalOpen && (
        <AutoOrganizeModal
          isOpen={isAutoOrganizeModalOpen}
          onClose={handleAutoOrganizeModalClose}
          bookmarks={bookmarks}
          createFolder={createFolder}
          renameFolder={renameFolder}
          deleteFolder={deleteFolder}
          isBulkUpdating={isBulkUpdating}
          applyBookmarkOrganization={applyBookmarkOrganization}
        />
      )}

      {isOrganizeModalOpen && (
        <OrganizeBookmarksModal
          onClose={closeOrganizeModal}
          onConfirm={handleOrganizeConfirm}
          isLoading={isOrganizeProgressModalOpen}
        />
      )}

      {isOrganizeProgressModalOpen && (
        <OrganizeProgressModal
          isOpen={isOrganizeProgressModalOpen}
          onClose={handleOrganizeProgressClose}
          progress={(organizeProgress.processedCount / Math.max(organizeProgress.totalCount, 1)) * 100}
          currentBatch={organizeProgress.currentBatch}
          totalBatches={organizeProgress.totalBatches}
          processedCount={organizeProgress.processedCount}
          totalCount={organizeProgress.totalCount}
          currentStatus={organizeProgress.currentStatus}
          canClose={
            organizeAbortController === null &&
            (organizeProgress.totalCount === 0 || organizeProgress.processedCount >= organizeProgress.totalCount)
          }
        />
      )}

      <ConfirmDialog
        isOpen={isOrganizeAbortConfirmOpen}
        onClose={closeOrganizeAbortConfirm}
        onConfirm={handleConfirmOrganizeAbort}
        title={t('organizeProgress.title')}
        message={t('organizeProgress.confirmAbort')}
        confirmText={t('common.confirm')}
        cancelText={t('common.cancel')}
        danger={true}
      />

      <SelectionActionBar
        selectionCount={selectedBookmarkIds.length}
        actions={bookmarkPageActions}
        onCancel={toggleMultiSelectMode}
      />

      <ConfirmDialog
        isOpen={confirmDelete.isOpen}
        onClose={() => setConfirmDelete({ isOpen: false })}
        onConfirm={() => {
          // 保存当前滚动位置
          scrollPositionRef.current = window.scrollY || window.pageYOffset;

          if (confirmDelete.isBulk) {
            deleteBookmarks(selectedBookmarkIds);
            toast.success(t('bookmarks.deleteMultipleSuccess', { count: confirmDelete.count || 0 }));
            toggleMultiSelectMode();
          } else if (confirmDelete.id) {
            deleteBookmark(confirmDelete.id);
            toast.success(t('bookmarks.deleteSuccess'));
          }
          setConfirmDelete({ isOpen: false });
        }}
        title={confirmDelete.isBulk ? t('bookmarks.deleteMultipleBookmarks') : t('bookmarks.deleteBookmark')}
        message={
          confirmDelete.isBulk
            ? t('bookmarks.deleteMultipleConfirm', { count: confirmDelete.count || 0 })
            : t('bookmarks.deleteConfirm')
        }
        confirmText={t('common.delete')}
        cancelText={t('common.cancel')}
        danger={true}
      />

      <Modal
        isOpen={isAddBookmarkModalOpen}
        onClose={() => setIsAddBookmarkModalOpen(false)}
        title={t('history.addBookmark')}
      >
        <AddBookmarkForm
          onSuccess={() => {
            setIsAddBookmarkModalOpen(false);
            toast.success(t('bookmarks.addSuccess'));
            refreshBookmarks();
          }}
        />
      </Modal>

      <DeduplicateModal
        isOpen={isDeduplicateModalOpen}
        onClose={() => {
          setIsDeduplicateModalOpen(false);
          setDuplicateBookmarks([]);
        }}
        duplicates={duplicateBookmarks}
        onConfirm={handleDeduplicateConfirm}
      />

      {/* AI生成标签进度模态框 - Neo-Brutalism 风格 */}
      {currentTagGenerationTitle && (
        <div className="fixed inset-0 modal-overlay flex items-center justify-center z-50 transition-colors">
          <div className="nb-card-static w-full max-w-md p-8">
            <h3 className="text-lg font-bold mb-4 nb-text">{t('bookmarks.generatingTags')}</h3>
            <p className="nb-text-secondary mb-4">{currentTagGenerationTitle}</p>
            <div className="flex items-center justify-center py-6">
              {isGeneratingTags ? (
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-[color:var(--nb-border)]/30 border-t-[color:var(--nb-accent-yellow)]"></div>
              ) : (
                <span className="material-symbols-outlined text-6xl text-[color:var(--nb-accent-green)]">check_circle</span>
              )}
            </div>
            <p className="text-center nb-text mb-6">{generationStatusMessage}</p>
            <div className="flex justify-end space-x-4">
              {isGeneratingTags && (
                <button
                  onClick={cancelTagGeneration}
                  className="nb-btn nb-btn-secondary px-5 py-2"
                >
                  {t('common.cancel')}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 批量重新生成标签模态框 */}
      <BulkTagRegenerationModal
        isOpen={isBulkRegenerationModalOpen}
        progress={bulkRegenerationProgress}
        onCancel={handleCancelBulkRegeneration}
        onComplete={handleCompleteBulkRegeneration}
      />
    </div>
  );
};
