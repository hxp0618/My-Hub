import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { TagInfo } from '../../../types/tags';
import { ItemCard } from './ItemCard';
import { getFaviconUrl, getUrlHostname } from '../../../utils/favicon';
import { timeAgo } from '../utils';
import { createLogger } from '../../../utils/logger';

const logger = createLogger('[TagDetailView]');

interface TagDetailViewProps {
  tag: TagInfo;
  onBack: () => void;
  onRename: (tag: TagInfo) => void;
  onDelete: (tag: TagInfo) => void;
  onRemoveTag: (bookmarkUrl: string) => Promise<void>;
  onRefresh: () => void;
}

interface TagBookmarkItem {
  id: string;
  title: string;
  url: string;
  dateAdded?: number;
}

export const TagDetailView: React.FC<TagDetailViewProps> = ({
  tag,
  onBack,
  onRename,
  onDelete,
  onRemoveTag,
  onRefresh,
}) => {
  const { t } = useTranslation();
  const [bookmarks, setBookmarks] = useState<TagBookmarkItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [removingUrl, setRemovingUrl] = useState<string | null>(null);

  const loadBookmarks = useCallback(async () => {
    setLoading(true);
    try {
      const entries = await Promise.all(
        (tag.bookmarkUrls || []).map(async bookmarkUrl => {
          try {
            const nodes = await chrome.bookmarks.search({ url: bookmarkUrl });
            const node = nodes.find(n => n.url === bookmarkUrl) ?? nodes[0];
            if (node) {
              return {
                id: node.id,
                title: node.title || bookmarkUrl,
                url: bookmarkUrl,
                dateAdded: node.dateAdded,
              };
            }
          } catch (error) {
            logger.warn('Failed to load bookmark for tagged URL', error);
          }
          return {
            id: bookmarkUrl,
            title: bookmarkUrl,
            url: bookmarkUrl,
          };
        })
      );
      setBookmarks(entries.filter(Boolean));
    } catch (error) {
      logger.error('Failed to load tag bookmarks', error);
      setBookmarks([]);
    } finally {
      setLoading(false);
    }
  }, [tag]);

  useEffect(() => {
    loadBookmarks();
  }, [loadBookmarks]);

  const handleRemoveTag = useCallback(
    async (url: string) => {
      setRemovingUrl(url);
      try {
        await onRemoveTag(url);
        await loadBookmarks();
        onRefresh();
      } finally {
        setRemovingUrl(null);
      }
    },
    [loadBookmarks, onRefresh, onRemoveTag]
  );

  const handleOpenAll = async () => {
    for (const url of tag.bookmarkUrls) {
      try {
        await chrome.tabs.create({ url, active: false });
      } catch (error) {
        logger.error('Failed to open tagged bookmark tab', error);
      }
    }
  };

  const handleExport = () => {
    const payload = bookmarks.map(item => ({
      title: item.title,
      url: item.url,
      dateAdded: item.dateAdded,
    }));
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `tag-${tag.name}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const bookmarkCards = useMemo(() => {
    return bookmarks.map(bookmark => {
      const hostname = getUrlHostname(bookmark.url) || bookmark.url;

      return (
        <ItemCard
          key={bookmark.id}
          href={bookmark.url}
          title={bookmark.title}
          hostname={hostname}
          faviconUrl={getFaviconUrl(bookmark.url)}
          tags={[tag.name]}
          timeLabel={bookmark.dateAdded ? timeAgo(bookmark.dateAdded) : undefined}
          actions={[
            {
              label: t('tags.removeFromBookmark'),
              icon: 'label_off',
              onClick: () => handleRemoveTag(bookmark.url),
            },
          ]}
        />
      );
    });
  }, [bookmarks, tag.name, t, handleRemoveTag]);

  return (
    <div className="tag-detail-view">
      <header className="tag-detail-header nb-card-static">
        <button type="button" onClick={onBack} className="tag-detail-back nb-btn nb-btn-secondary px-4 py-2">
          <span className="material-symbols-outlined text-base">arrow_back</span>
          {t('tags.backToList')}
        </button>
        <div className="tag-detail-title">
          <h2 className="text-2xl font-semibold nb-text">{tag.name}</h2>
          <span className="nb-badge nb-badge-blue">
            {t('tags.itemCount', { count: tag.count })}
          </span>
        </div>
        <div className="tag-detail-actions">
          <button type="button" className="nb-btn nb-btn-secondary px-4 py-2" onClick={() => onRename(tag)}>
            {t('tags.rename')}
          </button>
          <button type="button" className="nb-btn nb-btn-danger px-4 py-2" onClick={() => onDelete(tag)}>
            {t('tags.delete')}
          </button>
        </div>
      </header>

      <div className="tag-detail-quick-actions">
        <button type="button" className="nb-btn nb-btn-secondary px-4 py-2" onClick={handleOpenAll}>
          {t('tags.openAll')}
        </button>
        <button type="button" className="nb-btn nb-btn-secondary px-4 py-2" onClick={handleExport}>
          {t('tags.exportList')}
        </button>
      </div>

      {loading ? (
        <div className="tag-detail-loading nb-card-static nb-text-secondary">{t('common.loading')}</div>
      ) : bookmarks.length === 0 ? (
        <div className="tag-detail-empty nb-card-static border-dashed">
          <div className="text-lg font-semibold nb-text mb-2">{t('tags.detailEmpty')}</div>
        </div>
      ) : (
        <div className="tag-detail-grid">
          {bookmarkCards}
        </div>
      )}

      {removingUrl && (
        <div className="text-sm nb-text-secondary">{t('tags.removeTag')}...</div>
      )}
    </div>
  );
};
