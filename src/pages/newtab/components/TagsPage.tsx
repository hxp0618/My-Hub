import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTagManagement } from '../../../hooks/useTagManagement';
import { TagInfo } from '../../../types/tags';
import { TagService } from '../../../services/tagService';
import { TagStatistics } from './TagStatistics';
import { TagList } from './TagList';
import { TagDetailView } from './TagDetailView';
import { RenameTagDialog } from './RenameTagDialog';
import { DeleteTagDialog } from './DeleteTagDialog';
import { MergeTagsDialog } from './MergeTagsDialog';

export const TagsPage: React.FC = () => {
  const { t } = useTranslation();
  const {
    tags,
    allTags,
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
  } = useTagManagement();

  const [detailTag, setDetailTag] = useState<TagInfo | null>(null);
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [selectedTagNames, setSelectedTagNames] = useState<string[]>([]);
  const [renameTarget, setRenameTarget] = useState<TagInfo | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TagInfo | null>(null);
  const [isMergeDialogOpen, setIsMergeDialogOpen] = useState(false);

  const selectedTags = useMemo(
    () =>
      selectedTagNames
        .map(name => allTags.find(tag => tag.name === name))
        .filter((tag): tag is TagInfo => Boolean(tag)),
    [selectedTagNames, allTags]
  );

  const resetSelection = () => {
    setSelectedTagNames([]);
    setIsMultiSelectMode(false);
  };

  const handleToggleMultiSelect = () => {
    setIsMultiSelectMode(prev => {
      const next = !prev;
      if (!next) {
        setSelectedTagNames([]);
      }
      return next;
    });
  };

  const handleToggleSelection = (tagName: string) => {
    setSelectedTagNames(prev =>
      prev.includes(tagName) ? prev.filter(name => name !== tagName) : [...prev, tagName]
    );
  };

  const handleSelectAll = () => {
    if (selectedTagNames.length === tags.length) {
      setSelectedTagNames([]);
    } else {
      setSelectedTagNames(tags.map(tag => tag.name));
    }
  };

  const handleDeleteSelected = async () => {
    const names = [...selectedTagNames];
    await Promise.all(names.map(name => deleteTag(name)));
    resetSelection();
    if (detailTag && names.includes(detailTag.name)) {
      setDetailTag(null);
    }
  };

  const handleMergeSelected = () => {
    if (selectedTagNames.length < 2) return;
    setIsMergeDialogOpen(true);
  };

  const handleMergeConfirm = async (newName: string, deleteOld: boolean) => {
    await mergeTags(selectedTagNames, newName, deleteOld);
    resetSelection();
  };

  const handleRenameConfirm = async (newName: string) => {
    if (!renameTarget) return;
    await renameTag(renameTarget.name, newName);
    if (detailTag?.name === renameTarget.name) {
      setDetailTag(prev => (prev ? { ...prev, name: newName } : prev));
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    await deleteTag(deleteTarget.name);
    setSelectedTagNames(prev => prev.filter(name => name !== deleteTarget.name));
    if (detailTag?.name === deleteTarget.name) {
      setDetailTag(null);
    }
  };

  const handleRemoveTagFromBookmark = async (bookmarkUrl: string) => {
    if (!detailTag) return;
    await TagService.removeTagFromBookmark(bookmarkUrl, detailTag.name);
    await loadTags();
  };

  useEffect(() => {
    if (!detailTag) return;
    const updated = allTags.find(tag => tag.name === detailTag.name);
    if (updated) {
      setDetailTag(updated);
    } else {
      setDetailTag(null);
    }
  }, [allTags, detailTag?.name]);

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm nb-text-secondary">{t('tags.title')}</p>
          <h1 className="text-3xl font-bold nb-text">{t('tags.title')}</h1>
        </div>
      </div>

      <TagStatistics statistics={statistics} loading={loading} />

      {detailTag ? (
        <TagDetailView
          tag={detailTag}
          onBack={() => setDetailTag(null)}
          onRename={setRenameTarget}
          onDelete={setDeleteTarget}
          onRemoveTag={handleRemoveTagFromBookmark}
          onRefresh={loadTags}
        />
      ) : (
        <TagList
          tags={tags}
          loading={loading}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          sortBy={sortBy}
          onSortChange={setSortBy}
          isMultiSelectMode={isMultiSelectMode}
          onToggleMultiSelect={handleToggleMultiSelect}
          selectedTags={selectedTagNames}
          onToggleTagSelection={handleToggleSelection}
          onSelectAll={handleSelectAll}
          onClearSelection={() => setSelectedTagNames([])}
          onViewDetails={tag => setDetailTag(tag)}
          onRename={setRenameTarget}
          onDelete={setDeleteTarget}
          onMergeSelected={handleMergeSelected}
          onDeleteSelected={handleDeleteSelected}
        />
      )}

      <RenameTagDialog
        tag={renameTarget}
        isOpen={Boolean(renameTarget)}
        onClose={() => setRenameTarget(null)}
        onConfirm={handleRenameConfirm}
      />

      <DeleteTagDialog
        tag={deleteTarget}
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
      />

      <MergeTagsDialog
        tags={selectedTags}
        isOpen={isMergeDialogOpen}
        onClose={() => setIsMergeDialogOpen(false)}
        onConfirm={handleMergeConfirm}
      />
    </div>
  );
};
