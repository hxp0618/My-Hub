import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useToastContext } from '../../../contexts/ToastContext';
import { getAllTagGenerationFailures } from '../../../db/indexedDB';
import { BulkTagRegenerationService } from '../../../services/bulkTagRegenerationService';
import { BulkRegenerationProgress, BulkRegenerationConfig } from '../../../types/tags';
import { createLogger } from '../../../utils/logger';

const logger = createLogger('[useBulkTagRegeneration]');

const DEFAULT_BULK_CONFIG: BulkRegenerationConfig = {
  batchSize: 5,
  delayBetweenBatches: 1000,
  maxRetries: 3,
  previewMode: false,
};

const INITIAL_PROGRESS: BulkRegenerationProgress = {
  total: 0,
  processed: 0,
  successful: 0,
  failed: 0,
  status: 'idle',
};

export const useBulkTagRegeneration = (refreshBookmarks: () => void | Promise<void>) => {
  const { t } = useTranslation();
  const toast = useToastContext();
  const [isBulkRegenerationModalOpen, setIsBulkRegenerationModalOpen] = useState(false);
  const [bulkRegenerationProgress, setBulkRegenerationProgress] = useState<BulkRegenerationProgress>(INITIAL_PROGRESS);
  const [bulkRegenerationService, setBulkRegenerationService] = useState<BulkTagRegenerationService | null>(null);
  const [failureCount, setFailureCount] = useState(0);

  const refreshFailureCount = useCallback(async () => {
    const failures = await getAllTagGenerationFailures();
    setFailureCount(failures.length);
  }, []);

  useEffect(() => {
    refreshFailureCount().catch((error) => {
      logger.error('Failed to load failure count', error);
    });
  }, [refreshFailureCount]);

  const runBulkRegeneration = useCallback(async (mode: 'all' | 'failed') => {
    const service = new BulkTagRegenerationService(DEFAULT_BULK_CONFIG);
    setBulkRegenerationService(service);
    setIsBulkRegenerationModalOpen(true);

    try {
      const run = mode === 'all' ? service.regenerateAllTags : service.retryFailedTags;
      await run.call(service, (progress) => {
        setBulkRegenerationProgress(progress);
      });

      await refreshFailureCount();
      await refreshBookmarks();
    } catch (error) {
      logger.error(mode === 'all' ? 'Bulk regeneration error' : 'Retry failed tags error', error);
      toast.error(t(mode === 'all' ? 'bookmarks.bulkRegenerationError' : 'bookmarks.retryFailedError'));
    }
  }, [refreshBookmarks, refreshFailureCount, t, toast]);

  const handleRegenerateAllTags = useCallback(() => {
    void runBulkRegeneration('all');
  }, [runBulkRegeneration]);

  const handleRetryFailedTags = useCallback(() => {
    void runBulkRegeneration('failed');
  }, [runBulkRegeneration]);

  const handleCancelBulkRegeneration = useCallback(() => {
    bulkRegenerationService?.cancel();
  }, [bulkRegenerationService]);

  const handleCompleteBulkRegeneration = useCallback(() => {
    setIsBulkRegenerationModalOpen(false);
    setBulkRegenerationService(null);
    setBulkRegenerationProgress(INITIAL_PROGRESS);
  }, []);

  return {
    failureCount,
    isBulkRegenerationModalOpen,
    bulkRegenerationProgress,
    handleRegenerateAllTags,
    handleRetryFailedTags,
    handleCancelBulkRegeneration,
    handleCompleteBulkRegeneration,
  };
};
