import { EnhancedBookmark } from './bookmarks';

export interface TagInfo {
  name: string;
  count: number;
  bookmarkUrls: string[];
  color?: string;
  createdAt?: number;
  lastUsed?: number;
}

export interface TagStatistics {
  totalTags: number;
  totalItems: number;
  unusedTags: number;
  topTags: TagInfo[];
}

export type TagSortBy = 'name' | 'count' | 'recent';

export interface TagWithBookmarks extends TagInfo {
  bookmarks: EnhancedBookmark[];
}

export interface TagGenerationFailure {
  url: string;
  bookmarkId: string;
  failureReason: string;
  failureTimestamp: number;
  retryCount: number;
  lastRetryTimestamp?: number;
}

export interface BulkRegenerationProgress {
  total: number;
  processed: number;
  successful: number;
  failed: number;
  currentBookmark?: string;
  status: 'idle' | 'running' | 'paused' | 'completed' | 'cancelled';
}

export interface BulkRegenerationConfig {
  batchSize: number;
  delayBetweenBatches: number;
  maxRetries: number;
  previewMode: boolean;
}
