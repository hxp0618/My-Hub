import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useToastContext } from '../contexts/ToastContext';
import { TagService } from '../services/tagService';
import { TagInfo, TagSortBy, TagStatistics } from '../types/tags';

export const useTagManagement = () => {
  const { t } = useTranslation();
  const toast = useToastContext();

  const [tags, setTags] = useState<TagInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [statistics, setStatistics] = useState<TagStatistics | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<TagSortBy>('count');

  const loadTags = useCallback(async () => {
    setLoading(true);
    try {
      const [tagData, stats] = await Promise.all([
        TagService.aggregateTags(),
        TagService.getStatistics(),
      ]);
      setTags(tagData);
      setStatistics(stats);
    } catch (error) {
      console.error('Failed to load tags:', error);
      toast.error(t('tags.loadError'));
    } finally {
      setLoading(false);
    }
  }, [t, toast]);

  useEffect(() => {
    loadTags();
  }, [loadTags]);

  const filteredTags = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    let result = term
      ? tags.filter(tag => tag.name.toLowerCase().includes(term))
      : [...tags];

    result.sort((a, b) => {
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name);
      }
      if (sortBy === 'count') {
        return b.count - a.count;
      }
      return (b.lastUsed || 0) - (a.lastUsed || 0);
    });

    return result;
  }, [tags, searchTerm, sortBy]);

  const renameTag = useCallback(
    async (oldName: string, newName: string) => {
      try {
        await TagService.renameTag(oldName, newName);
        await loadTags();
        toast.success(t('tags.renameSuccess'));
      } catch (error) {
        console.error('Failed to rename tag:', error);
        toast.error(t('tags.renameError'));
      }
    },
    [loadTags, t, toast]
  );

  const deleteTag = useCallback(
    async (tagName: string) => {
      try {
        await TagService.deleteTag(tagName);
        await loadTags();
        toast.success(t('tags.deleteSuccess'));
      } catch (error) {
        console.error('Failed to delete tag:', error);
        toast.error(t('tags.deleteError'));
      }
    },
    [loadTags, t, toast]
  );

  const mergeTags = useCallback(
    async (tagNames: string[], newName: string, deleteOld = true) => {
      try {
        await TagService.mergeTags(tagNames, newName, deleteOld);
        await loadTags();
        toast.success(t('tags.mergeSuccess'));
      } catch (error) {
        console.error('Failed to merge tags:', error);
        toast.error(t('tags.mergeError'));
      }
    },
    [loadTags, t, toast]
  );

  return {
    tags: filteredTags,
    allTags: tags,
    loading,
    statistics,
    searchTerm,
    setSearchTerm,
    sortBy,
    setSortBy,
    loadTags,
    renameTag,
    deleteTag,
    mergeTags,
  };
};
