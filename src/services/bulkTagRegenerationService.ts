import { BulkRegenerationConfig, BulkRegenerationProgress, TagGenerationFailure } from '../types/tags';
import { EnhancedBookmark } from '../types/bookmarks';
import { TagService } from './tagService';
import { sendMessage } from './llmService';
import { buildTagGenerationPrompt } from '../lib/tagGenerationPrompts';
import { unwrapCodeFence } from '../lib/llmUtils';
import {
  getAllTagGenerationFailures,
  addTagGenerationFailure,
  removeTagGenerationFailure,
  batchUpdateTags,
} from '../db/indexedDB';
import { createLogger } from '../utils/logger';
import i18n from '../i18n';

const logger = createLogger('[BulkTagRegenerationService]');

export interface BulkRegenerationResult {
  total: number;
  successful: number;
  failed: number;
  cancelled: boolean;
}

export class BulkTagRegenerationService {
  private abortController: AbortController | null = null;
  private config: BulkRegenerationConfig;
  private progressCallback?: (progress: BulkRegenerationProgress) => void;

  constructor(config: BulkRegenerationConfig) {
    this.config = config;
  }

  async regenerateAllTags(
    onProgress: (progress: BulkRegenerationProgress) => void
  ): Promise<BulkRegenerationResult> {
    this.abortController = new AbortController();
    this.progressCallback = onProgress;

    try {
      // Fetch all bookmarks from Chrome API
      const bookmarkTree = await chrome.bookmarks.getTree();
      const allBookmarks = this.flattenBookmarks(bookmarkTree[0].children || []);
      
      // Filter to only bookmarks with URLs (not folders)
      const bookmarksWithUrls = allBookmarks.filter(b => b.url);

      // Fetch existing tags
      const existingTagsInfo = await TagService.aggregateTags();
      const existingTags = existingTagsInfo.map(t => t.name);

      const total = bookmarksWithUrls.length;
      let processed = 0;
      let successful = 0;
      let failed = 0;

      logger.info(`Starting regeneration for ${total} bookmarks`);

      // Update initial progress
      onProgress({
        total,
        processed: 0,
        successful: 0,
        failed: 0,
        status: 'running',
      });

      // Process in batches
      for (let i = 0; i < bookmarksWithUrls.length; i += this.config.batchSize) {
        // Check if cancelled
        if (this.abortController.signal.aborted) {
          logger.info('Regeneration cancelled');
          onProgress({
            total,
            processed,
            successful,
            failed,
            status: 'cancelled',
          });
          return { total, successful, failed, cancelled: true };
        }

        const batch = bookmarksWithUrls.slice(i, i + this.config.batchSize);
        const batchResult = await this.processBookmarkBatch(batch, existingTags);

        successful += batchResult.successful;
        failed += batchResult.failed;
        processed += batch.length;

        // Update progress
        onProgress({
          total,
          processed,
          successful,
          failed,
          currentBookmark: batch[batch.length - 1]?.title,
          status: 'running',
        });

        // Apply rate limiting delay between batches
        if (i + this.config.batchSize < bookmarksWithUrls.length) {
          await this.rateLimitDelay();
        }
      }

      logger.info(`Regeneration completed: ${successful} successful, ${failed} failed`);

      // Update final progress
      onProgress({
        total,
        processed,
        successful,
        failed,
        status: 'completed',
      });

      return { total, successful, failed, cancelled: false };
    } catch (error) {
      logger.error('Error during regeneration:', error);
      throw error;
    } finally {
      this.abortController = null;
    }
  }

  private flattenBookmarks(nodes: chrome.bookmarks.BookmarkTreeNode[]): EnhancedBookmark[] {
    const result: EnhancedBookmark[] = [];
    for (const node of nodes) {
      result.push(node as EnhancedBookmark);
      if (node.children) {
        result.push(...this.flattenBookmarks(node.children));
      }
    }
    return result;
  }

  async retryFailedTags(
    onProgress: (progress: BulkRegenerationProgress) => void
  ): Promise<BulkRegenerationResult> {
    this.abortController = new AbortController();
    this.progressCallback = onProgress;

    try {
      // Fetch all failure records
      const failures = await getAllTagGenerationFailures();

      // Check if there are any failures
      if (failures.length === 0) {
        logger.info('No failed bookmarks to retry');
        onProgress({
          total: 0,
          processed: 0,
          successful: 0,
          failed: 0,
          status: 'completed',
        });
        return { total: 0, successful: 0, failed: 0, cancelled: false };
      }

      // Filter failures that haven't exceeded max retries
      const retriableFailures = failures.filter(
        f => f.retryCount < this.config.maxRetries
      );

      if (retriableFailures.length === 0) {
        logger.info('All failed bookmarks have exceeded max retries');
        onProgress({
          total: failures.length,
          processed: failures.length,
          successful: 0,
          failed: failures.length,
          status: 'completed',
        });
        return { total: failures.length, successful: 0, failed: failures.length, cancelled: false };
      }

      // Fetch bookmark details for failed URLs
      const bookmarks: EnhancedBookmark[] = [];
      for (const failure of retriableFailures) {
        try {
          const results = await chrome.bookmarks.search({ url: failure.url });
          if (results.length > 0) {
            bookmarks.push(results[0] as EnhancedBookmark);
          }
        } catch (error) {
          logger.warn(`Failed to fetch bookmark for URL ${failure.url}:`, error);
        }
      }

      // Fetch existing tags
      const existingTagsInfo = await TagService.aggregateTags();
      const existingTags = existingTagsInfo.map(t => t.name);

      const total = bookmarks.length;
      let processed = 0;
      let successful = 0;
      let failed = 0;

      logger.info(`Starting retry for ${total} failed bookmarks`);

      // Update initial progress
      onProgress({
        total,
        processed: 0,
        successful: 0,
        failed: 0,
        status: 'running',
      });

      // Process in batches
      for (let i = 0; i < bookmarks.length; i += this.config.batchSize) {
        // Check if cancelled
        if (this.abortController.signal.aborted) {
          logger.info('Retry cancelled');
          onProgress({
            total,
            processed,
            successful,
            failed,
            status: 'cancelled',
          });
          return { total, successful, failed, cancelled: true };
        }

        const batch = bookmarks.slice(i, i + this.config.batchSize);
        const batchResult = await this.processBookmarkBatch(batch, existingTags);

        successful += batchResult.successful;
        failed += batchResult.failed;
        processed += batch.length;

        // Update progress
        onProgress({
          total,
          processed,
          successful,
          failed,
          currentBookmark: batch[batch.length - 1]?.title,
          status: 'running',
        });

        // Apply rate limiting delay between batches
        if (i + this.config.batchSize < bookmarks.length) {
          await this.rateLimitDelay();
        }
      }

      logger.info(`Retry completed: ${successful} successful, ${failed} failed`);

      // Update final progress
      onProgress({
        total,
        processed,
        successful,
        failed,
        status: 'completed',
      });

      return { total, successful, failed, cancelled: false };
    } catch (error) {
      logger.error('Error during retry:', error);
      throw error;
    } finally {
      this.abortController = null;
    }
  }

  cancel(): void {
    if (this.abortController) {
      this.abortController.abort();
      logger.info('Bulk regeneration cancelled by user');
    }
  }

  private async processBookmarkBatch(
    bookmarks: EnhancedBookmark[],
    existingTags: string[]
  ): Promise<{ successful: number; failed: number }> {
    const results = await Promise.allSettled(
      bookmarks.map(async (bookmark) => {
        // Check if cancelled
        if (this.abortController?.signal.aborted) {
          throw new Error('Operation cancelled');
        }

        try {
          const tags = await this.generateTagsForBookmark(bookmark, existingTags);
          await this.handleGenerationSuccess(bookmark, tags);
          return { success: true };
        } catch (error) {
          // Check if it's a rate limit error
          if (error instanceof Error && error.message.includes('429')) {
            // Apply exponential backoff and retry
            await this.exponentialBackoff(1);
            try {
              const tags = await this.generateTagsForBookmark(bookmark, existingTags);
              await this.handleGenerationSuccess(bookmark, tags);
              return { success: true };
            } catch (retryError) {
              await this.handleGenerationFailure(bookmark, retryError as Error);
              return { success: false };
            }
          } else {
            await this.handleGenerationFailure(bookmark, error as Error);
            return { success: false };
          }
        }
      })
    );

    const successful = results.filter(
      r => r.status === 'fulfilled' && r.value.success
    ).length;
    const failed = results.length - successful;

    return { successful, failed };
  }

  private async generateTagsForBookmark(
    bookmark: EnhancedBookmark,
    existingTags: string[]
  ): Promise<string[]> {
    if (!bookmark.url) {
      throw new Error('Bookmark has no URL');
    }

    const systemPrompt = buildTagGenerationPrompt(existingTags);
    const userMessage = i18n.t('tagGeneration.promptTemplate', { title: bookmark.title, url: bookmark.url });

    return new Promise((resolve, reject) => {
      let fullResponse = '';

      sendMessage(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        {
          onUpdate: (chunk: string) => {
            fullResponse += chunk;
          },
          onFinish: (fullText?: string) => {
            const finalText = fullText || fullResponse;
            try {
              // Parse tags from response
              const cleanedText = unwrapCodeFence(finalText).trim();
              const tags = cleanedText
                .split(/[,，]/)
                .map(tag => tag.trim())
                .filter(tag => tag.length > 0);

              if (tags.length === 0) {
                reject(new Error('No tags generated'));
              } else {
                resolve(tags);
              }
            } catch (error) {
              reject(new Error(`Failed to parse tags: ${error}`));
            }
          },
          onError: (error: Error) => {
            reject(error);
          },
        },
        this.abortController?.signal,
        { stream: false }
      );
    });
  }

  private async handleGenerationFailure(
    bookmark: EnhancedBookmark,
    error: Error
  ): Promise<void> {
    if (!bookmark.url) return;

    try {
      // Get existing failure record to increment retry count
      const existingFailure = await import('../db/indexedDB').then(m => 
        m.getTagGenerationFailure(bookmark.url!)
      );

      const failure: TagGenerationFailure = {
        url: bookmark.url,
        bookmarkId: bookmark.id,
        failureReason: error.message,
        failureTimestamp: existingFailure?.failureTimestamp || Date.now(),
        retryCount: (existingFailure?.retryCount || 0) + 1,
        lastRetryTimestamp: Date.now(),
      };

      await addTagGenerationFailure(failure);
      logger.warn(`Tag generation failed for ${bookmark.title}: ${error.message}`);
    } catch (dbError) {
      logger.error('Failed to record tag generation failure:', dbError);
    }
  }

  private async handleGenerationSuccess(
    bookmark: EnhancedBookmark,
    tags: string[]
  ): Promise<void> {
    if (!bookmark.url) return;

    try {
      // Update tags in database
      await batchUpdateTags([{ url: bookmark.url, tags }]);

      // Remove any existing failure record
      await removeTagGenerationFailure(bookmark.url);

      logger.info(`Successfully generated tags for ${bookmark.title}: ${tags.join(', ')}`);
    } catch (error) {
      logger.error('Failed to save generated tags:', error);
      throw error;
    }
  }

  private async rateLimitDelay(): Promise<void> {
    if (this.config.delayBetweenBatches > 0) {
      await new Promise(resolve => setTimeout(resolve, this.config.delayBetweenBatches));
    }
  }

  private async exponentialBackoff(retryCount: number): Promise<void> {
    const baseDelay = 1000; // 1 second
    const maxDelay = 60000; // 60 seconds
    const delay = Math.min(baseDelay * Math.pow(2, retryCount), maxDelay);
    logger.info(`Applying exponential backoff: ${delay}ms (retry ${retryCount})`);
    await new Promise(resolve => setTimeout(resolve, delay));
  }
}
