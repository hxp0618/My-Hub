import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { exportBookmarksToHTML } from '../../../lib/bookmarkExport';
import { organizeBookmarksBatch, OrganizeProgress } from '../../../services/bookmarkOrganizeService';
import { BookmarkOrganization, EnhancedBookmark } from '../../../types/bookmarks';
import { createLogger } from '../../../utils/logger';

const logger = createLogger('[useBookmarkOrganization]');

const INITIAL_PROGRESS: OrganizeProgress = {
  currentBatch: 0,
  totalBatches: 0,
  processedCount: 0,
  totalCount: 0,
  currentStatus: '',
};

const debugLog = (...args: unknown[]) => {
  logger.debug(...args);
};

export const useBookmarkOrganization = ({
  bookmarks,
  applyBookmarkOrganizationBatch,
  refreshBookmarks,
}: {
  bookmarks: EnhancedBookmark[];
  applyBookmarkOrganizationBatch: (plan: BookmarkOrganization[]) => Promise<void>;
  refreshBookmarks: () => void | Promise<void>;
}) => {
  const { t } = useTranslation();
  const [isOrganizeModalOpen, setIsOrganizeModalOpen] = useState(false);
  const [isOrganizeProgressModalOpen, setIsOrganizeProgressModalOpen] = useState(false);
  const [organizeProgress, setOrganizeProgress] = useState<OrganizeProgress>(INITIAL_PROGRESS);
  const [organizeAbortController, setOrganizeAbortController] = useState<AbortController | null>(null);
  const [isOrganizeAbortConfirmOpen, setIsOrganizeAbortConfirmOpen] = useState(false);

  const openOrganizeModal = useCallback(() => {
    setIsOrganizeModalOpen(true);
  }, []);

  const closeOrganizeModal = useCallback(() => {
    debugLog('用户关闭AI整理确认对话框');
    setIsOrganizeModalOpen(false);
  }, []);

  const handleOrganizeConfirm = useCallback(async (action: 'export' | 'organize') => {
    debugLog('用户确认AI整理操作:', action);
    setIsOrganizeModalOpen(false);

    if (action === 'export') {
      debugLog('执行导出书签操作');
      exportBookmarksToHTML(bookmarks);
      return;
    }

    debugLog('开始AI整理书签流程');
    setIsOrganizeProgressModalOpen(true);

    const controller = new AbortController();
    setOrganizeAbortController(controller);

    try {
      await organizeBookmarksBatch(
        bookmarks,
        bookmarks,
        (progress: OrganizeProgress) => {
          debugLog('整理进度更新:', progress);
          setOrganizeProgress(progress);
        },
        applyBookmarkOrganizationBatch,
        controller.signal
      );

      debugLog('AI整理书签完成或中止');
      await refreshBookmarks();

      if (!controller.signal.aborted) {
        setOrganizeProgress(prev => ({ ...prev, currentStatus: t('organizeProgress.done') }));
      }
    } catch (error) {
      logger.error('AI整理书签失败', error);
      setOrganizeProgress(prev => ({
        ...prev,
        currentStatus: t('organizeAiModal.applyError'),
      }));
    } finally {
      setOrganizeAbortController(null);
    }
  }, [applyBookmarkOrganizationBatch, bookmarks, refreshBookmarks, t]);

  const closeOrganizeProgressModal = useCallback(() => {
    setIsOrganizeProgressModalOpen(false);
    setOrganizeProgress(INITIAL_PROGRESS);
    void refreshBookmarks();
  }, [refreshBookmarks]);

  const handleOrganizeProgressClose = useCallback(() => {
    debugLog('关闭整理进度对话框');
    if (organizeAbortController) {
      setIsOrganizeAbortConfirmOpen(true);
      return;
    }
    closeOrganizeProgressModal();
  }, [closeOrganizeProgressModal, organizeAbortController]);

  const handleConfirmOrganizeAbort = useCallback(() => {
    debugLog('用户确认中止，取消整理操作');
    organizeAbortController?.abort();
    setOrganizeAbortController(null);
    setIsOrganizeAbortConfirmOpen(false);
    closeOrganizeProgressModal();
  }, [closeOrganizeProgressModal, organizeAbortController]);

  const closeOrganizeAbortConfirm = useCallback(() => {
    debugLog('用户取消中止操作');
    setIsOrganizeAbortConfirmOpen(false);
  }, []);

  return {
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
  };
};
