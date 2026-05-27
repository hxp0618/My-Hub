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

export const TAG_GENERATION_FAILURE_REASON_KEYS = [
  'missingUrl',
  'noTagsGenerated',
  'parseFailed',
  'rateLimited',
  'networkError',
  'cancelled',
  'generationFailed',
  'saveFailed',
] as const;

export type TagGenerationFailureReasonKey = typeof TAG_GENERATION_FAILURE_REASON_KEYS[number];

export const DEFAULT_TAG_GENERATION_FAILURE_REASON: TagGenerationFailureReasonKey = 'generationFailed';

export const isTagGenerationFailureReasonKey = (
  value: unknown
): value is TagGenerationFailureReasonKey =>
  TAG_GENERATION_FAILURE_REASON_KEYS.includes(value as TagGenerationFailureReasonKey);

export const sanitizeTagGenerationFailureReason = (
  value: unknown
): TagGenerationFailureReasonKey =>
  isTagGenerationFailureReasonKey(value) ? value : DEFAULT_TAG_GENERATION_FAILURE_REASON;

export interface TagGenerationFailure {
  url: string;
  bookmarkId: string;
  failureReason: TagGenerationFailureReasonKey;
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
