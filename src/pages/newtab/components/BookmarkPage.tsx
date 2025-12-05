import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useBookmarks } from '../hooks/useBookmarks';
import { EnhancedBookmark } from '../../../types/bookmarks';
import { SortOrder } from '../types';
import { BookmarkFolderTree } from './BookmarkFolderTree';
import TagInput from '../../../components/TagInput';
import { ItemCard } from './ItemCard';
import { formatDate } from '../utils';
import BookmarkTree from '../../../components/BookmarkTree';
import { SelectionActionBar, ActionItem } from '../../../components/SelectionActionBar';
import { AutoOrganizeModal } from './AutoOrganizeModal';
import { OrganizeBookmarksModal } from '../../../components/OrganizeBookmarksModal';
import { OrganizeProgressModal } from '../../../components/OrganizeProgressModal';
import { exportBookmarksToHTML } from '../../../lib/bookmarkExport';
import { organizeBookmarksBatch, OrganizeProgress } from '../../../services/bookmarkOrganizeService';
import UnifiedSearchBar from '../../../components/UnifiedSearchBar';
import { getAllBookmarkTags } from '../../../db/indexedDB';
import { buildTagGenerationPrompt } from '../../../lib/tagGenerationPrompts';
import { sendMessage } from '../../../services/llmService';
import { BookmarkTreeSkeleton } from '../../../components/SkeletonLoader';
import { useClickOutside } from '../../../hooks/useClickOutside';
import { ConfirmDialog } from '../../../components/ConfirmDialog';
import { useToastContext } from '../../../contexts/ToastContext';
import { useTranslation } from 'react-i18next';
import { Modal } from '../../../components/Modal';
import AddBookmarkForm from './AddBookmarkForm';
import { findFolder, flattenBookmarks, getFaviconUrl } from '../../../utils/bookmarkUtils';
import { BulkTagRegenerationModal } from '../../../components/BulkTagRegenerationModal';
import { FailedBookmarksIndicator } from '../../../components/FailedBookmarksIndicator';
import { BulkTagRegenerationService } from '../../../services/bulkTagRegenerationService';
import { BulkRegenerationProgress, BulkRegenerationConfig } from '../../../types/tags';
import { getAllTagGenerationFailures } from '../../../db/indexedDB';

const ReorderConfirmModal: React.FC<{
    onClose: () => void;
    onConfirm: () => void;
    sortOrderText: string;
    isLoading: boolean;
}> = ({ onClose, onConfirm, sortOrderText, isLoading }) => {
    const { t } = useTranslation();
    return (
        <div className="fixed inset-0 modal-overlay flex items-center justify-center z-50">
            <div className="nb-card-static w-full max-w-lg p-8">
                <h3 className="text-lg font-bold mb-4 nb-text">{t('bookmarks.reorderTitle')}</h3>
                <p className="nb-text">{t('bookmarks.reorderMessage', { sortOrder: sortOrderText })}</p>
                <p className="text-sm nb-text-secondary mt-2">{t('bookmarks.reorderWarning')}</p>
                <div className="flex justify-end space-x-4 mt-8">
                    <button onClick={onClose} className="nb-btn nb-btn-secondary px-5 py-2" disabled={isLoading}>{t('common.cancel')}</button>
                    <button onClick={onConfirm} className="nb-btn nb-btn-primary px-5 py-2" disabled={isLoading}>
                        {isLoading ? t('common.loading') : t('common.confirm')}
                    </button>
                </div>
            </div>
        </div>
    );
};

const DeduplicateModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    duplicates: { url: string; bookmarks: EnhancedBookmark[] }[];
    onConfirm: (bookmarksToDelete: string[]) => void;
}> = ({ isOpen, onClose, duplicates, onConfirm }) => {
    const { t } = useTranslation();
    const [selectedToKeep, setSelectedToKeep] = useState<Map<string, string>>(new Map());

    // 初始化选择：默认保留最早添加的书签
    React.useEffect(() => {
        if (duplicates.length > 0 && selectedToKeep.size === 0) {
            const initialSelection = new Map<string, string>();
            duplicates.forEach(({ url, bookmarks }) => {
                const oldest = bookmarks.reduce((prev, current) =>
                    (prev.dateAdded || 0) < (current.dateAdded || 0) ? prev : current
                );
                initialSelection.set(url, oldest.id);
            });
            setSelectedToKeep(initialSelection);
        }
    }, [duplicates]);

    const handleConfirm = () => {
        const bookmarksToDelete: string[] = [];
        duplicates.forEach(({ url, bookmarks }) => {
            const keepId = selectedToKeep.get(url);
            bookmarks.forEach(bookmark => {
                if (bookmark.id !== keepId) {
                    bookmarksToDelete.push(bookmark.id);
                }
            });
        });
        onConfirm(bookmarksToDelete);
    };

    if (!isOpen) return null;

    if (duplicates.length === 0) {
        return (
            <div className="fixed inset-0 modal-overlay flex items-center justify-center z-50">
                <div className="nb-card-static w-full max-w-2xl p-8">
                    <h3 className="text-lg font-bold mb-4 nb-text">{t('bookmarks.deduplicateTitle')}</h3>
                    <p className="nb-text-secondary mb-6">{t('bookmarks.noDuplicates')}</p>
                    <div className="flex justify-end">
                        <button onClick={onClose} className="nb-btn nb-btn-primary px-5 py-2">
                            {t('common.close')}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    const totalDuplicates = duplicates.reduce((sum, { bookmarks }) => sum + bookmarks.length - 1, 0);

    return (
        <div className="fixed inset-0 modal-overlay flex items-center justify-center z-50">
            <div className="nb-card-static w-full max-w-4xl p-8 max-h-[80vh] overflow-y-auto">
                <h3 className="text-lg font-bold mb-2 nb-text">{t('bookmarks.deduplicateTitle')}</h3>
                <p className="nb-text-secondary mb-6">
                    {t('bookmarks.deduplicateMessage', { count: totalDuplicates, groups: duplicates.length })}
                </p>

                <div className="space-y-6 mb-6">
                    {duplicates.map(({ url, bookmarks }) => (
                        <div key={url} className="nb-card-static p-4">
                            <div className="font-medium mb-3 truncate nb-text" title={url}>{url}</div>
                            <div className="space-y-2">
                                {bookmarks.map(bookmark => (
                                    <label
                                        key={bookmark.id}
                                        className="flex items-center gap-3 p-3 nb-bg-card nb-border rounded-lg cursor-pointer hover:bg-[color:var(--nb-bg)]"
                                    >
                                        <input
                                            type="radio"
                                            name={`duplicate-${url}`}
                                            checked={selectedToKeep.get(url) === bookmark.id}
                                            onChange={() => {
                                                const newSelection = new Map(selectedToKeep);
                                                newSelection.set(url, bookmark.id);
                                                setSelectedToKeep(newSelection);
                                            }}
                                            className="w-4 h-4 accent-[color:var(--nb-accent-yellow)]"
                                        />
                                        <div className="flex-1 min-w-0">
                                            <div className="font-medium truncate nb-text">{bookmark.title}</div>
                                            <div className="text-sm nb-text-secondary">
                                                {bookmark.dateAdded && new Date(bookmark.dateAdded).toLocaleDateString()}
                                                {bookmark.parentId && ` • ${t('bookmarks.folder_label')}`}
                                            </div>
                                        </div>
                                    </label>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="flex justify-end space-x-4">
                    <button onClick={onClose} className="nb-btn nb-btn-secondary px-5 py-2">
                        {t('common.cancel')}
                    </button>
                    <button onClick={handleConfirm} className="nb-btn nb-btn-danger px-5 py-2">
                        {t('bookmarks.deleteNDuplicates', { count: totalDuplicates })}
                    </button>
                </div>
            </div>
        </div>
    );
};

// =================================================================================
// Helper Functions
// =================================================================================
// Note: findFolder, flattenBookmarks, and getFaviconUrl moved to utils/bookmarkUtils.ts


// =================================================================================
// Sub-components
// =================================================================================

const AddTagsModal: React.FC<{
    onClose: () => void;
    onSave: (tags: string[]) => void;
}> = ({ onClose, onSave }) => {
    const { t } = useTranslation();
    const [tags, setTags] = useState<string[]>([]);

    return (
        <div className="fixed inset-0 modal-overlay flex items-center justify-center z-50">
            <div className="nb-card-static w-full max-w-lg p-8">
                <h3 className="text-lg font-bold mb-6 nb-text">{t('bookmarks.addTags')}</h3>
                <TagInput tags={tags} setTags={setTags} />
                <div className="flex justify-end space-x-4 mt-8">
                    <button onClick={onClose} className="nb-btn nb-btn-secondary px-5 py-2">{t('common.cancel')}</button>
                    <button onClick={() => onSave(tags)} className="nb-btn nb-btn-primary px-5 py-2">{t('common.save')}</button>
                </div>
            </div>
        </div>
    );
};

const MoveBookmarksModal: React.FC<{
    onClose: () => void;
    onMove: (targetParentId: string) => void;
}> = ({ onClose, onMove }) => {
    const { t } = useTranslation();
    const [targetId, setTargetId] = useState('1');
    
    return (
        <div className="fixed inset-0 modal-overlay flex items-center justify-center z-50">
            <div className="nb-card-static w-full max-w-lg p-8">
                <h3 className="text-lg font-bold mb-6 nb-text">{t('bookmarks.moveTo')}</h3>
                <BookmarkTree selectedFolder={targetId} setSelectedFolder={setTargetId} />
                <div className="flex justify-end space-x-4 mt-8">
                    <button onClick={onClose} className="nb-btn nb-btn-secondary px-5 py-2">{t('common.cancel')}</button>
                    <button onClick={() => onMove(targetId)} className="nb-btn nb-btn-primary px-5 py-2">{t('actions.move')}</button>
                </div>
            </div>
        </div>
    );
};

const EditModal: React.FC<{
    item: EnhancedBookmark;
    onClose: () => void;
    onSave: (id: string, newTitle: string, newUrl: string, newTags: string[], newParentId: string) => void;
    moveBookmark: (id: string, newParentId: string) => Promise<void>;
}> = ({ item, onClose, onSave, moveBookmark }) => {
    const { t } = useTranslation();
    const [title, setTitle] = useState(item.title);
    const [url, setUrl] = useState(item.url || '');
    const [tags, setTags] = useState(item.tags || []);
    const [parentId, setParentId] = useState(item.parentId || '1');
    const [isGenerating, setIsGenerating] = useState(false);
    const [abortController, setAbortController] = useState<AbortController | null>(null);
    const [statusMessage, setStatusMessage] = useState('');
    const hasAutoSuggestedRef = useRef(false);

    const unwrapCodeFence = (text: string): string => {
        if (!text) return '';
        const fenced = text.match(/```(?:\w+)?\s*([\s\S]*?)```/);
        return (fenced ? fenced[1] : text).trim();
    };

    const handleGenerateTags = async () => {
        if (!title || !url) {
            setStatusMessage(t('bookmarks.fillTitleUrl'));
            return;
        }

        setIsGenerating(true);
        setStatusMessage(t('bookmarks.generatingTags'));

        const controller = new AbortController();
        setAbortController(controller);

        try {
            const existingBookmarkTags = await getAllBookmarkTags();
            const allExistingTags = Array.from(new Set(
                existingBookmarkTags.flatMap((bookmark: { tags: string[] }) => bookmark.tags)
            ));

            const systemPrompt = buildTagGenerationPrompt(allExistingTags);
            const userMessage = t('tagGeneration.promptTemplate', { title, url });

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
                    onFinish: () => {
                        const finalContent = unwrapCodeFence(generatedContent);
                        if (finalContent) {
                            const generatedTags = finalContent
                                .trim()
                                .split(',')
                                .map(tag => tag.trim())
                                .filter(tag => tag.length > 0);
                            setTags(generatedTags);
                            setStatusMessage(t('tagGeneration.successMessage', { count: generatedTags.length }));
                        } else {
                            setStatusMessage(t('bookmarks.tagGenerateFailed'));
                        }
                        setIsGenerating(false);
                        setAbortController(null);
                    },
                    onError: (error: Error) => {
                        console.error('生成标签失败:', error);
                        setStatusMessage(t('bookmarks.tagGenerateError', { message: error.message }));
                        setIsGenerating(false);
                        setAbortController(null);
                    },
                },
                controller.signal
            );
        } catch (error) {
            console.error('生成标签出错:', error);
            setStatusMessage(t('bookmarks.tagGenerateRetry'));
            setIsGenerating(false);
            setAbortController(null);
        }
    };

    const handleCancelGeneration = () => {
        if (abortController) {
            abortController.abort();
            setAbortController(null);
            setIsGenerating(false);
            setStatusMessage(t('bookmarks.tagGenerateCancelled'));
        }
    };

    // 打开弹窗时，若开启自动建议，则自动生成标签（与 AddBookmarkForm 保持一致）
    useEffect(() => {
        const autoSuggestEnabled = JSON.parse(localStorage.getItem('autoSuggestBookmarkInfo') || 'false');
        if (autoSuggestEnabled && title && url && !hasAutoSuggestedRef.current) {
            hasAutoSuggestedRef.current = true;
            handleGenerateTags();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleSave = () => {
        onSave(item.id, title, url, tags, parentId);
        onClose();
    };
    
    return (
        <div className="fixed inset-0 modal-overlay flex items-center justify-center z-50">
            <div className="nb-card-static w-full max-w-lg p-8">
                <h3 className="text-lg font-bold mb-6 nb-text">{t('bookmarks.editBookmark')}</h3>
                <div className="space-y-4">
                    <div>
                        <label className="text-sm font-medium nb-text-secondary">{t('bookmarks.title_label')}</label>
                        <input type="text" value={title} onChange={e => setTitle(e.target.value)} className="nb-input w-full mt-1"/>
                    </div>
                    <div>
                        <label className="text-sm font-medium nb-text-secondary">{t('bookmarks.url_label')}</label>
                        <input type="text" value={url} onChange={e => setUrl(e.target.value)} className="nb-input w-full mt-1"/>
                    </div>
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-medium nb-text-secondary">{t('bookmarks.tags_label')}</label>
                        {isGenerating ? (
                            <button
                                onClick={handleCancelGeneration}
                                className="nb-btn nb-btn-danger px-3 py-1 text-xs"
                            >
                                {t('bookmarks.cancel_generate')}
                            </button>
                        ) : (
                            <button
                                onClick={() => handleGenerateTags()}
                                disabled={!title || !url}
                                className="nb-btn nb-btn-primary px-3 py-1 text-xs"
                            >
                                {t('bookmarks.generateAI')}
                            </button>
                        )}
                    </div>
                    <TagInput tags={tags} setTags={setTags} />
                    {statusMessage && (
                        <p className="mt-2 text-xs nb-text-secondary">{statusMessage}</p>
                    )}
                </div>
                    <div>
                        <label className="text-sm font-medium nb-text-secondary">{t('bookmarks.folder_label')}</label>
                        <BookmarkTree selectedFolder={parentId} setSelectedFolder={setParentId} />
                    </div>
                </div>
                <div className="flex justify-end space-x-4 mt-8">
                    <button onClick={onClose} className="nb-btn nb-btn-secondary px-5 py-2">{t('common.cancel')}</button>
                    <button onClick={handleSave} className="nb-btn nb-btn-primary px-5 py-2">{t('common.save')}</button>
                </div>
            </div>
        </div>
    )
}


// =================================================================================
// Main Component
// =================================================================================

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
    clearSelection,
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
  const [cardsPerRow, setCardsPerRow] = useState<number>(() => {
    const saved = localStorage.getItem('cardsPerRow');
    return saved ? parseInt(saved, 10) : 4;
  });
  const [isAddBookmarkModalOpen, setIsAddBookmarkModalOpen] = useState(false);
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [isAddTagsModalOpen, setIsAddTagsModalOpen] = useState(false);
  const [showReorderConfirm, setShowReorderConfirm] = useState(false);
  const [isAutoOrganizeModalOpen, setIsAutoOrganizeModalOpen] = useState(false);
  const [organizeMenuOpen, setOrganizeMenuOpen] = useState(false);
  const organizeMenuRef = useRef<HTMLDivElement>(null);
  useClickOutside(organizeMenuRef, () => setOrganizeMenuOpen(false));

  // 文件夹栏折叠状态 - 使用 localStorage 持久化
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    try {
      const stored = localStorage.getItem('bookmark-sidebar-collapsed');
      return stored === 'true';
    } catch (error) {
      return false;
    }
  });

  const toggleSidebar = () => {
    const newState = !isSidebarCollapsed;
    setIsSidebarCollapsed(newState);
    try {
      localStorage.setItem('bookmark-sidebar-collapsed', String(newState));
    } catch (error) {
      console.error('Error saving sidebar state:', error);
    }
  };

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

  // AI整理书签相关状态
  const [isOrganizeModalOpen, setIsOrganizeModalOpen] = useState(false);
  const [isOrganizeProgressModalOpen, setIsOrganizeProgressModalOpen] = useState(false);
  const [organizeProgress, setOrganizeProgress] = useState<OrganizeProgress>({
    currentBatch: 0,
    totalBatches: 0,
    processedCount: 0,
    totalCount: 0,
    currentStatus: ''
  });
  const [organizeAbortController, setOrganizeAbortController] = useState<AbortController | null>(null);

  // 去重相关状态
  const [isDeduplicateModalOpen, setIsDeduplicateModalOpen] = useState(false);
  const [duplicateBookmarks, setDuplicateBookmarks] = useState<{
    url: string;
    bookmarks: EnhancedBookmark[];
  }[]>([]);

  // AI生成标签相关状态
  const [isGeneratingTags, setIsGeneratingTags] = useState(false);
  const [tagGenerationItem, setTagGenerationItem] = useState<EnhancedBookmark | null>(null);
  const [generationStatusMessage, setGenerationStatusMessage] = useState('');
  const [tagGenerationAbortController, setTagGenerationAbortController] = useState<AbortController | null>(null);

  // 批量重新生成标签相关状态
  const [isBulkRegenerationModalOpen, setIsBulkRegenerationModalOpen] = useState(false);
  const [bulkRegenerationProgress, setBulkRegenerationProgress] = useState<BulkRegenerationProgress>({
    total: 0,
    processed: 0,
    successful: 0,
    failed: 0,
    status: 'idle',
  });
  const [bulkRegenerationService, setBulkRegenerationService] = useState<BulkTagRegenerationService | null>(null);
  const [failureCount, setFailureCount] = useState(0);

  // AI生成标签处理函数
  const handleGenerateTags = async (item: EnhancedBookmark) => {
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
                // 更新书签标签
                await updateBookmarkTags(item.id, generatedTags);
                setGenerationStatusMessage(t('bookmarks.tagGenerateSuccess', { count: generatedTags.length }));
                toast.success(t('bookmarks.tagGenerateSuccess', { count: generatedTags.length }));
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
      }, 1000);
    }
  };

  // 加载失败计数
  useEffect(() => {
    const loadFailureCount = async () => {
      try {
        const failures = await getAllTagGenerationFailures();
        setFailureCount(failures.length);
      } catch (error) {
        console.error('Failed to load failure count:', error);
      }
    };
    loadFailureCount();
  }, []);

  // 批量重新生成所有标签
  const handleRegenerateAllTags = async () => {
    const config: BulkRegenerationConfig = {
      batchSize: 5,
      delayBetweenBatches: 1000,
      maxRetries: 3,
      previewMode: false,
    };

    const service = new BulkTagRegenerationService(config);
    setBulkRegenerationService(service);
    setIsBulkRegenerationModalOpen(true);

    try {
      await service.regenerateAllTags((progress) => {
        setBulkRegenerationProgress(progress);
      });

      // 刷新失败计数
      const failures = await getAllTagGenerationFailures();
      setFailureCount(failures.length);

      // 刷新书签列表
      refreshBookmarks();
    } catch (error) {
      console.error('Bulk regeneration error:', error);
      toast.error(t('bookmarks.bulkRegenerationError'));
    }
  };

  // 重试失败的标签
  const handleRetryFailedTags = async () => {
    const config: BulkRegenerationConfig = {
      batchSize: 5,
      delayBetweenBatches: 1000,
      maxRetries: 3,
      previewMode: false,
    };

    const service = new BulkTagRegenerationService(config);
    setBulkRegenerationService(service);
    setIsBulkRegenerationModalOpen(true);

    try {
      await service.retryFailedTags((progress) => {
        setBulkRegenerationProgress(progress);
      });

      // 刷新失败计数
      const failures = await getAllTagGenerationFailures();
      setFailureCount(failures.length);

      // 刷新书签列表
      refreshBookmarks();
    } catch (error) {
      console.error('Retry failed tags error:', error);
      toast.error(t('bookmarks.retryFailedError'));
    }
  };

  // 取消批量重新生成
  const handleCancelBulkRegeneration = () => {
    if (bulkRegenerationService) {
      bulkRegenerationService.cancel();
    }
  };

  // 完成批量重新生成
  const handleCompleteBulkRegeneration = () => {
    setIsBulkRegenerationModalOpen(false);
    setBulkRegenerationService(null);
    setBulkRegenerationProgress({
      total: 0,
      processed: 0,
      successful: 0,
      failed: 0,
      status: 'idle',
    });
  };

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
      console.error('Error deduplicating bookmarks:', error);
      toast.error(t('bookmarks.deduplicateError'));
    }
  };

  // AI整理书签处理函数
  const handleOrganizeConfirm = async (action: 'export' | 'organize') => {
    console.log('[BookmarkPage] 用户确认AI整理操作:', action);
    setIsOrganizeModalOpen(false);
    
    if (action === 'export') {
      console.log('[BookmarkPage] 执行导出书签操作');
      exportBookmarksToHTML(bookmarks);
      return; // 导出后直接返回
    }
    
    // 开始整理流程
    console.log('[BookmarkPage] 开始AI整理书签流程');
    setIsOrganizeProgressModalOpen(true);
    
    const controller = new AbortController();
    setOrganizeAbortController(controller);

    console.log('[BookmarkPage] 开始AI整理书签流程', bookmarks);
    
    try {
      await organizeBookmarksBatch(
        bookmarks,
        bookmarks,
        (progress: OrganizeProgress) => {
          console.log('[BookmarkPage] 整理进度更新:', progress);
          setOrganizeProgress(progress);
        },
        applyBookmarkOrganizationBatch,
        controller.signal
      );
      
      console.log('[BookmarkPage] AI整理书签完成或中止');
      
      // 刷新书签数据
      await refreshBookmarks();
      
      // 如果操作不是被中止的，那么就显示完成
      if (!controller.signal.aborted) {
        setOrganizeProgress(prev => ({ ...prev, currentStatus: t('organizeProgress.done') }));
      }
      
    } catch (error) {
      console.error('[BookmarkPage] AI整理书签失败:', error);
      setOrganizeProgress(prev => ({ 
        ...prev, 
        currentStatus: `${t('organizeAiModal.applyError')}: ${error instanceof Error ? error.message : t('tools.common.unknownError')}` 
      }));
    } finally {
      setOrganizeAbortController(null);
    }
  };

  const handleOrganizeProgressClose = () => {
    console.log('[BookmarkPage] 关闭整理进度对话框');
    if (organizeAbortController) {
      if (window.confirm(t('organizeProgress.confirmAbort'))) {
        console.log('[BookmarkPage] 用户确认中止，取消整理操作');
        organizeAbortController.abort();
        setOrganizeAbortController(null);
      } else {
        console.log('[BookmarkPage] 用户取消中止操作');
        return; // 如果用户取消，则不关闭对话框
      }
    }
    setIsOrganizeProgressModalOpen(false);
    setOrganizeProgress({
      currentBatch: 0,
      totalBatches: 0,
      processedCount: 0,
      totalCount: 0,
      currentStatus: ''
    });
    // 强制刷新一下数据，以防有部分应用的结果
    refreshBookmarks();
  };

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const [key, order] = e.target.value.split('-') as [SortOrder['key'], SortOrder['order']];
    updateSortOrder({ key, order });
  };

  const selectedFolder = useMemo(() => findFolder(bookmarks, selectedFolderId), [bookmarks, selectedFolderId]);
  const allBookmarksFlat = useMemo(() => flattenBookmarks(bookmarks), [bookmarks]);

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
  
  const searchResults = useMemo(() => {
    if (!searchTerm) return [];
    const term = searchTerm.toLowerCase();
    return allBookmarksFlat.filter(
      item =>
        item.title.toLowerCase().includes(term) ||
        (item.url && item.url.toLowerCase().includes(term)) ||
        (item.tags && item.tags.some(tag => tag.toLowerCase().includes(term)))
    );
  }, [searchTerm, allBookmarksFlat]);

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
      className: "text-main hover:text-main",
      disabled: selectedBookmarkIds.length === 0,
    },
    {
      label: t('bookmarks.addTags'),
      onClick: () => setIsAddTagsModalOpen(true),
      className: "text-main hover:text-main",
      disabled: selectedBookmarkIds.length === 0,
    },
    {
      label: t('common.delete'),
      onClick: handleBulkDelete,
      className: 'text-danger hover:opacity-80',
      disabled: selectedBookmarkIds.length === 0,
    },
  ];

  const bookmarksToDisplay = useMemo(() => {
    if (searchTerm) {
      return searchResults;
    }
    if (selectedFolder) {
      const flatBookmarks = flattenBookmarks(selectedFolder.children || []);
      // Re-sort the flattened bookmarks
      return flatBookmarks.sort((a, b) => {
        const aVal = a[sortOrder.key] || 0;
        const bVal = b[sortOrder.key] || 0;

        if (aVal < bVal) {
          return sortOrder.order === 'asc' ? -1 : 1;
        }
        if (aVal > bVal) {
          return sortOrder.order === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return [];
  }, [searchTerm, searchResults, selectedFolder, sortOrder]);

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
    <div className="flex h-full pl-10 nb-bg nb-text">
      <aside className={`transition-all duration-300 ease-in-out h-full nb-bg nb-border nb-shadow relative z-20 overflow-y-auto pt-10 rounded-xl ${
        isSidebarCollapsed ? 'w-0 pr-0 border-0 shadow-none' : 'w-1/5 min-w-[200px] pr-4'
      }`}>
        {!isSidebarCollapsed && (
          <>
            <div className="flex justify-between items-center mb-4 pr-2">
                <h2 className="text-xl font-bold text-main">{t('bookmarks.folders')}</h2>
                <div className="relative" ref={organizeMenuRef}>
                    <button onClick={() => setOrganizeMenuOpen(!organizeMenuOpen)} className="nb-btn nb-btn-ghost p-1 rounded-full">
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
                                        console.log('[BookmarkPage] 用户点击AI整理书签');
                                        setIsOrganizeModalOpen(true);
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
      
      <main className="flex-1 h-full overflow-y-auto">
        <header className="sticky top-0 z-5 flex items-center justify-between nb-bg nb-border nb-shadow pb-4 pt-10 px-8 rounded-b-xl">
          <div className="flex items-center gap-3">
            <button
              onClick={toggleSidebar}
              className="nb-btn nb-btn-ghost p-2 rounded-full"
              title={isSidebarCollapsed ? t('bookmarks.expand') : t('bookmarks.collapse')}
            >
              <span className="material-symbols-outlined icon-linear text-lg">
                {isSidebarCollapsed ? 'menu_open' : 'menu'}
              </span>
            </button>
            <h2 className="text-xl font-bold text-main">
              {isMultiSelectMode ? t('bookmarks.selectedCount', { count: selectedBookmarkIds.length }) : (searchTerm ? t('bookmarks.searchResults', { term: searchTerm }) : selectedFolder?.title || t('bookmarks.title'))}
            </h2>
            <FailedBookmarksIndicator failureCount={failureCount} onRetryClick={handleRetryFailedTags} />
          </div>
          <div className="flex items-center space-x-4">
            {!isMultiSelectMode && (
              <button
                onClick={() => setIsAddBookmarkModalOpen(true)}
                className="nb-btn nb-btn-primary flex items-center gap-2 px-4 py-2"
              >
                <span className="material-symbols-outlined icon-linear text-lg">add</span>
                <span className="font-medium">{t('history.addBookmark')}</span>
              </button>
            )}
            <div className="w-64">
                <UnifiedSearchBar
                    mode="bookmark"
                    value={searchTerm}
                    onChange={setSearchTerm}
                    placeholder={t('bookmarks.searchPlaceholder')}
                    loading={loading}
                />
            </div>
            <div className="relative">
                <select
                    value={`${sortOrder.key}-${sortOrder.order}`}
                    onChange={handleSortChange}
                    className="nb-input px-4 py-2 appearance-none cursor-pointer"
                >
                    <option value="dateAdded-desc">{t('bookmarks.sortByDateAddedDesc')}</option>
                    <option value="dateAdded-asc">{t('bookmarks.sortByDateAddedAsc')}</option>
                    <option value="dateLastUsed-desc">{t('bookmarks.sortByDateLastUsedDesc')}</option>
                    <option value="dateLastUsed-asc">{t('bookmarks.sortByDateLastUsedAsc')}</option>
                    <option value="title-asc">{t('bookmarks.sortByNameAsc')}</option>
                    <option value="title-desc">{t('bookmarks.sortByNameDesc')}</option>
                </select>
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
            <div className="relative" ref={moreMenuRef}>
                <button onClick={() => setShowMoreMenu(!showMoreMenu)} className="nb-btn nb-btn-ghost p-2 rounded-full">
                    <span className="material-symbols-outlined icon-linear text-lg">more_vert</span>
                </button>
                {showMoreMenu && (
                    <div className="nb-dropdown absolute right-0 mt-2 w-56 z-10">
                        <div className="py-1">
                            <div
                                onClick={() => {
                                    toggleMultiSelectMode();
                                    setShowMoreMenu(false);
                                }}
                                className="nb-dropdown-item flex items-center gap-3 text-sm font-medium cursor-pointer"
                            >
                                <span className="material-symbols-outlined icon-linear text-lg nb-text-secondary">checklist</span>
                                {t('bookmarks.select')}
                            </div>
                            <div
                                onClick={() => {
                                    handleRegenerateAllTags();
                                    setShowMoreMenu(false);
                                }}
                                className="nb-dropdown-item flex items-center gap-3 text-sm font-medium cursor-pointer"
                            >
                                <span className="material-symbols-outlined icon-linear text-lg nb-text-secondary">refresh</span>
                                {t('bookmarks.regenerateAllTags')}
                            </div>
                            <div
                                onClick={handleStartDeduplicate}
                                className="nb-dropdown-item flex items-center gap-3 text-sm font-medium cursor-pointer"
                            >
                                <span className="material-symbols-outlined icon-linear text-lg nb-text-secondary">content_copy</span>
                                {t('bookmarks.deduplicate')}
                            </div>
                            <div
                                onClick={() => {
                                    setShowReorderConfirm(true);
                                    setShowMoreMenu(false);
                                }}
                                className="nb-dropdown-item flex items-center gap-3 text-sm font-medium cursor-pointer"
                            >
                                <span className="material-symbols-outlined icon-linear text-lg nb-text-secondary">sort</span>
                                {t('bookmarks.updateChromeOrder')}
                            </div>
                        </div>
                    </div>
                )}
            </div>
          </div>
        </header>

        <div className={`mt-8 ${getGridClass()} px-8`}>
            {bookmarksToDisplay.length > 0 ? bookmarksToDisplay.map(item => {
              const dateToDisplay = sortOrder.key === 'dateLastUsed' ? item.dateLastUsed : item.dateAdded;

              return (
                <ItemCard
                    key={item.id}
                    href={item.url!}
                    title={item.title}
                    hostname={new URL(item.url!).hostname}
                    faviconUrl={getFaviconUrl(item.url!)}
                    tags={item.tags}
                    actions={bookmarkActions(item)}
                    timeLabel={dateToDisplay ? formatDate(dateToDisplay) : undefined}
                    isMultiSelectMode={isMultiSelectMode}
                    isSelected={selectedBookmarkIds.includes(item.id)}
                    onSelect={() => toggleBookmarkSelection(item.id)}
                    dragProps={{
                      draggable: !isMultiSelectMode,
                      onDragStart: (event) => handleBookmarkDragStart(event, item),
                      onDragEnd: handleBookmarkDragEnd,
                    }}
                />
              );
            }) : (
                <p className="text-center nb-text-secondary pt-10 col-span-full">
                    {searchTerm ? t('bookmarks.noResults') : t('bookmarks.emptyFolder')}
                </p>
            )}
        </div>
      </main>

      {editingItem && (
        <EditModal 
            item={editingItem} 
            onClose={() => setEditingItem(null)} 
            onSave={handleSaveEdit}
            moveBookmark={moveBookmark}
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
          onClose={() => {
            console.log('[BookmarkPage] 用户关闭AI整理确认对话框');
            setIsOrganizeModalOpen(false);
          }}
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
          canClose={organizeAbortController === null && organizeProgress.currentStatus.includes('完成')}
        />
      )}

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
      {tagGenerationItem && (
        <div className="fixed inset-0 modal-overlay flex items-center justify-center z-50 transition-colors">
          <div className="nb-card-static w-full max-w-md p-8">
            <h3 className="text-lg font-bold mb-4 nb-text">{t('bookmarks.generatingTags')}</h3>
            <p className="nb-text-secondary mb-4">{tagGenerationItem.title}</p>
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
