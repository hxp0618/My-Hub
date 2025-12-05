import {
  getAllBookmarkTags,
  batchUpdateTags,
  deleteBookmarkTag,
  getBookmarkTag,
} from '../db/indexedDB';
import { EnhancedBookmark } from '../types/bookmarks';
import { TagInfo, TagStatistics, TagWithBookmarks } from '../types/tags';

const ensureUpdatesPersisted = async (updates: { url: string; tags: string[] }[]) => {
  if (updates.length === 0) return;
  const updatesWithTags = updates.filter(update => update.tags.length > 0);
  const emptyTagUrls = updates.filter(update => update.tags.length === 0).map(update => update.url);

  if (updatesWithTags.length > 0) {
    await batchUpdateTags(updatesWithTags);
  }

  if (emptyTagUrls.length > 0) {
    await Promise.all(emptyTagUrls.map(url => deleteBookmarkTag(url)));
  }
};

export class TagService {
  static async aggregateTags(): Promise<TagInfo[]> {
    const bookmarkTags = await getAllBookmarkTags();
    const tagMap = new Map<string, TagInfo>();

    bookmarkTags.forEach(bt => {
      bt.tags.forEach(tag => {
        if (!tagMap.has(tag)) {
          tagMap.set(tag, {
            name: tag,
            count: 0,
            bookmarkUrls: [],
          });
        }

        const tagInfo = tagMap.get(tag)!;
        tagInfo.count += 1;
        tagInfo.bookmarkUrls.push(bt.url);
      });
    });

    return Array.from(tagMap.values());
  }

  static async getStatistics(): Promise<TagStatistics> {
    const tags = await this.aggregateTags();
    const totalTags = tags.length;
    const totalItems = tags.reduce((sum, tag) => sum + tag.count, 0);
    const unusedTags = tags.filter(tag => tag.count === 0).length;
    const topTags = [...tags].sort((a, b) => b.count - a.count).slice(0, 5);

    return {
      totalTags,
      totalItems,
      unusedTags,
      topTags,
    };
  }

  static async renameTag(oldName: string, newName: string): Promise<void> {
    if (!oldName || !newName || oldName === newName) return;

    const bookmarkTags = await getAllBookmarkTags();
    const updates = bookmarkTags
      .filter(bt => bt.tags.includes(oldName))
      .map(bt => ({
        url: bt.url,
        tags: bt.tags.map(tag => (tag === oldName ? newName : tag)),
      }));

    await ensureUpdatesPersisted(updates);
  }

  static async deleteTag(tagName: string): Promise<void> {
    if (!tagName) return;

    const bookmarkTags = await getAllBookmarkTags();
    const updates = bookmarkTags
      .filter(bt => bt.tags.includes(tagName))
      .map(bt => ({
        url: bt.url,
        tags: bt.tags.filter(tag => tag !== tagName),
      }));

    await ensureUpdatesPersisted(updates);
  }

  static async mergeTags(tagNames: string[], newName: string, deleteOld = true): Promise<void> {
    if (!newName || tagNames.length === 0) return;
    const bookmarkTags = await getAllBookmarkTags();

    const updates = bookmarkTags
      .filter(bt => bt.tags.some(tag => tagNames.includes(tag)))
      .map(bt => {
        let tags = [...bt.tags];
        if (deleteOld) {
          tags = tags.filter(tag => !tagNames.includes(tag));
        }

        if (!tags.includes(newName)) {
          tags.push(newName);
        }

        tags = Array.from(new Set(tags));

        return {
          url: bt.url,
          tags,
        };
      });

    await ensureUpdatesPersisted(updates);
  }

  static async getTagWithBookmarks(
    tagName: string,
    bookmarks: EnhancedBookmark[]
  ): Promise<TagWithBookmarks | null> {
    if (!tagName) return null;
    const tags = await this.aggregateTags();
    const tagInfo = tags.find(tag => tag.name === tagName);
    if (!tagInfo) return null;

    const tagBookmarks = bookmarks.filter(bookmark => bookmark.tags?.includes(tagName));

    return {
      ...tagInfo,
      bookmarks: tagBookmarks,
    };
  }

  static async removeTagFromBookmark(bookmarkUrl: string, tagName: string): Promise<void> {
    if (!bookmarkUrl || !tagName) return;
    const bookmarkTag = await getBookmarkTag(bookmarkUrl);
    if (!bookmarkTag) return;

    const tags = bookmarkTag.tags.filter(tag => tag !== tagName);
    if (tags.length === 0) {
      await deleteBookmarkTag(bookmarkUrl);
      return;
    }

    await batchUpdateTags([{ url: bookmarkUrl, tags }]);
  }
}
