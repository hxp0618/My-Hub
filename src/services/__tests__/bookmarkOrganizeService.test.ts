import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '../../i18n';
import {
  getFoldersStructure,
  organizeBookmarksBatch,
  sanitizeOrganizeResults,
  type OrganizeProgress,
} from '../bookmarkOrganizeService';
import type { EnhancedBookmark } from '../../types/bookmarks';

const mocks = vi.hoisted(() => ({
  sendMessage: vi.fn(),
  getAllBookmarkTags: vi.fn(),
}));

vi.mock('../llmService', () => ({
  sendMessage: mocks.sendMessage,
}));

vi.mock('../../db/indexedDB', () => ({
  getAllBookmarkTags: mocks.getAllBookmarkTags,
}));

describe('bookmarkOrganizeService', () => {
  beforeEach(() => {
    vi.spyOn(console, 'debug').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mocks.getAllBookmarkTags.mockResolvedValue([]);
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
    await i18n.changeLanguage('zh-CN');
  });

  it('emits localized progress when there are no root-level bookmarks', async () => {
    await i18n.changeLanguage('en');

    const progressUpdates: OrganizeProgress[] = [];
    const bookmarks: EnhancedBookmark[] = [
      {
        id: '1',
        title: 'Bookmarks Bar',
        syncing: false,
        children: [
          {
            id: 'folder-1',
            title: 'Nested Folder',
            syncing: false,
            children: [],
          },
        ],
      },
    ];

    await organizeBookmarksBatch(
      bookmarks,
      bookmarks,
      (progress) => progressUpdates.push(progress),
      async () => {}
    );

    expect(progressUpdates).toHaveLength(1);
    expect(progressUpdates[0].currentStatus).toBe('No root-level bookmarks need organizing');
    expect(progressUpdates[0].currentStatus).not.toContain('根目录');
  });

  it('extracts typed folder structure without bookmark nodes', () => {
    const bookmarks: EnhancedBookmark[] = [
      {
        id: '1',
        title: 'Bookmarks Bar',
        syncing: false,
        children: [
          {
            id: 'folder-1',
            title: 'Work',
            syncing: false,
            children: [
              {
                id: 'bookmark-1',
                title: 'Example',
                url: 'https://example.com',
                syncing: false,
              },
              {
                id: 'folder-2',
                title: 'Docs',
                syncing: false,
                children: [],
              },
            ],
          },
        ],
      },
    ];

    expect(getFoldersStructure(bookmarks)).toEqual([
      {
        id: '1',
        title: 'Bookmarks Bar',
        children: [
          {
            id: 'folder-1',
            title: 'Work',
            children: [
              {
                id: 'folder-2',
                title: 'Docs',
                children: [],
              },
            ],
          },
        ],
      },
    ]);
  });

  it('sanitizes LLM organize results before generating a plan', () => {
    expect(sanitizeOrganizeResults([
      {
        id: 'bookmark-1',
        tags: [' docs ', 'docs', '', 42, 'typescript'],
        folder: ' Work ',
      },
      {
        id: 'bookmark-2',
        tags: 'not-array',
        folder: null,
      },
      {
        id: 3,
        tags: ['skip'],
        folder: 'Work',
      },
      null,
      {
        id: 'bookmark-4',
        tags: ['keep'],
        folder: 123,
      },
    ])).toEqual([
      {
        id: 'bookmark-1',
        tags: ['docs', 'typescript'],
        folder: 'Work',
      },
      {
        id: 'bookmark-2',
        tags: [],
        folder: null,
      },
      {
        id: 'bookmark-4',
        tags: ['keep'],
        folder: null,
      },
    ]);
  });

  it('does not expose raw model parse details in progress updates', async () => {
    await i18n.changeLanguage('en');
    mocks.sendMessage.mockImplementation((_messages, callbacks: { onFinish: (fullText?: string) => void }) => {
      callbacks.onFinish('raw model response with private bookmark context');
    });

    const progressUpdates: OrganizeProgress[] = [];
    const bookmarks: EnhancedBookmark[] = [
      {
        id: '1',
        title: 'Bookmarks Bar',
        syncing: false,
        children: [
          {
            id: 'bookmark-1',
            title: 'Sensitive Internal Page',
            url: 'https://secret.example.com',
            syncing: false,
          },
        ],
      },
    ];

    await organizeBookmarksBatch(
      bookmarks,
      bookmarks,
      (progress) => progressUpdates.push(progress),
      async () => {}
    );

    const joinedStatuses = progressUpdates.map(progress => progress.currentStatus).join(' ');
    expect(joinedStatuses).toContain('An error occurred while processing batch 1.');
    expect(joinedStatuses).not.toContain('raw model response');
    expect(joinedStatuses).not.toContain('private bookmark context');
    expect(joinedStatuses).not.toContain('Sensitive Internal Page');
    expect(joinedStatuses).not.toContain('secret.example.com');
  });

  it('does not expose raw batch application errors in progress updates', async () => {
    await i18n.changeLanguage('en');
    mocks.sendMessage.mockImplementation((_messages, callbacks: { onFinish: (fullText?: string) => void }) => {
      callbacks.onFinish(JSON.stringify([
        { id: 'bookmark-1', tags: ['docs'], folder: null },
      ]));
    });

    const progressUpdates: OrganizeProgress[] = [];
    const bookmarks: EnhancedBookmark[] = [
      {
        id: '1',
        title: 'Bookmarks Bar',
        syncing: false,
        children: [
          {
            id: 'bookmark-1',
            title: 'Sensitive Internal Page',
            url: 'https://secret.example.com',
            syncing: false,
          },
        ],
      },
    ];

    await organizeBookmarksBatch(
      bookmarks,
      bookmarks,
      (progress) => progressUpdates.push(progress),
      async () => {
        throw new Error('raw storage failure with bookmark id bookmark-1');
      }
    );

    const joinedStatuses = progressUpdates.map(progress => progress.currentStatus).join(' ');
    expect(joinedStatuses).toContain('An error occurred while processing batch 1.');
    expect(joinedStatuses).not.toContain('raw storage failure');
    expect(joinedStatuses).not.toContain('bookmark-1');
    expect(joinedStatuses).not.toContain('secret.example.com');
  });
});
