import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BulkTagRegenerationService } from '../bulkTagRegenerationService';

const mocks = vi.hoisted(() => ({
  sendMessage: vi.fn(),
  aggregateTags: vi.fn(),
  getAllTagGenerationFailures: vi.fn(),
  getTagGenerationFailure: vi.fn(),
  addTagGenerationFailure: vi.fn(),
  removeTagGenerationFailure: vi.fn(),
  batchUpdateTags: vi.fn(),
}));

vi.mock('../llmService', () => ({
  sendMessage: mocks.sendMessage,
}));

vi.mock('../tagService', () => ({
  TagService: {
    aggregateTags: mocks.aggregateTags,
  },
}));

vi.mock('../../db/indexedDB', () => ({
  getAllTagGenerationFailures: mocks.getAllTagGenerationFailures,
  getTagGenerationFailure: mocks.getTagGenerationFailure,
  addTagGenerationFailure: mocks.addTagGenerationFailure,
  removeTagGenerationFailure: mocks.removeTagGenerationFailure,
  batchUpdateTags: mocks.batchUpdateTags,
}));

const createService = () => new BulkTagRegenerationService({
  batchSize: 1,
  delayBetweenBatches: 0,
  maxRetries: 3,
  previewMode: false,
});

describe('BulkTagRegenerationService failure privacy', () => {
  beforeEach(() => {
    vi.spyOn(console, 'info').mockImplementation(() => undefined);
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.stubGlobal('chrome', {
      bookmarks: {
        getTree: vi.fn().mockResolvedValue([
          {
            children: [
              { id: 'bookmark-1', title: 'Private provider console', url: 'https://secret.example.com' },
            ],
          },
        ]),
        search: vi.fn(),
      },
    });
    mocks.aggregateTags.mockResolvedValue([]);
    mocks.getTagGenerationFailure.mockResolvedValue(undefined);
    mocks.addTagGenerationFailure.mockResolvedValue(undefined);
    mocks.removeTagGenerationFailure.mockResolvedValue(undefined);
    mocks.batchUpdateTags.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('stores a stable failure reason instead of raw provider errors', async () => {
    mocks.sendMessage.mockImplementation((_messages: unknown, callbacks: { onError: (error: Error) => void }) => {
      callbacks.onError(new Error('HTTP error 500: raw provider secret detail'));
    });

    const result = await createService().regenerateAllTags(vi.fn());

    expect(result).toMatchObject({ successful: 0, failed: 1 });
    expect(mocks.addTagGenerationFailure).toHaveBeenCalledWith(expect.objectContaining({
      failureReason: 'generationFailed',
    }));
    expect(JSON.stringify(mocks.addTagGenerationFailure.mock.calls)).not.toContain('raw provider secret detail');
  });

  it('maps empty model output to a stable no-tags reason', async () => {
    mocks.sendMessage.mockImplementation((_messages: unknown, callbacks: { onFinish: (fullText?: string) => void }) => {
      callbacks.onFinish('   ');
    });

    await createService().regenerateAllTags(vi.fn());

    expect(mocks.addTagGenerationFailure).toHaveBeenCalledWith(expect.objectContaining({
      failureReason: 'noTagsGenerated',
    }));
  });
});
