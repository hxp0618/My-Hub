import type { EnhancedBookmark } from '../types/bookmarks';

const SNAPSHOT_TTL_MS = 60_000;

export interface BookmarkSnapshot {
  bookmarks: EnhancedBookmark[];
  urls: Set<string>;
  bookmarkMap: Map<string, { id: string; tags: string[] }>;
}

let cachedSnapshot: BookmarkSnapshot | null = null;
let cacheExpiresAt = 0;
let inFlightSnapshot: Promise<BookmarkSnapshot> | null = null;
let listenersAttached = false;

const emptySnapshot = (): BookmarkSnapshot => ({
  bookmarks: [],
  urls: new Set(),
  bookmarkMap: new Map(),
});

const attachInvalidationListeners = () => {
  if (listenersAttached || typeof chrome === 'undefined' || !chrome.bookmarks) return;

  const invalidate = () => invalidateBookmarkSnapshot();
  const events = [
    chrome.bookmarks.onChanged,
    chrome.bookmarks.onCreated,
    chrome.bookmarks.onMoved,
    chrome.bookmarks.onRemoved,
  ];

  events.forEach(event => {
    if (typeof event?.addListener === 'function') {
      event.addListener(invalidate);
    }
  });
  listenersAttached = true;
};

const buildSnapshot = async (): Promise<BookmarkSnapshot> => {
  if (typeof chrome === 'undefined' || typeof chrome.bookmarks?.getTree !== 'function') {
    return emptySnapshot();
  }

  const [tree, allTags] = await Promise.all([
    chrome.bookmarks.getTree(),
    import('../db/indexedDB').then(module => module.getAllBookmarkTags()),
  ]);
  const tagsMap = new Map(allTags.map(bookmark => [bookmark.url, bookmark.tags]));
  const bookmarks: EnhancedBookmark[] = [];
  const urls = new Set<string>();
  const bookmarkMap = new Map<string, { id: string; tags: string[] }>();

  const visit = (nodes: chrome.bookmarks.BookmarkTreeNode[]) => {
    nodes.forEach(node => {
      if (node.url) {
        const tags = tagsMap.get(node.url) ?? [];
        bookmarks.push({ ...node, tags });
        urls.add(node.url);
        bookmarkMap.set(node.url, { id: node.id, tags });
      }
      if (node.children) visit(node.children);
    });
  };

  visit(tree);
  return { bookmarks, urls, bookmarkMap };
};

export const invalidateBookmarkSnapshot = (): void => {
  cachedSnapshot = null;
  cacheExpiresAt = 0;
};

export const getBookmarkSnapshot = async (force = false): Promise<BookmarkSnapshot> => {
  attachInvalidationListeners();

  if (!force && cachedSnapshot && Date.now() < cacheExpiresAt) {
    return cachedSnapshot;
  }
  if (!force && inFlightSnapshot) return inFlightSnapshot;

  const request = buildSnapshot()
    .then(snapshot => {
      cachedSnapshot = snapshot;
      cacheExpiresAt = Date.now() + SNAPSHOT_TTL_MS;
      return snapshot;
    })
    .finally(() => {
      if (inFlightSnapshot === request) inFlightSnapshot = null;
    });

  inFlightSnapshot = request;
  return request;
};
