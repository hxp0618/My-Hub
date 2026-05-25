import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTagManagement } from '../../../hooks/useTagManagement';
import { TagInfo } from '../../../types/tags';
import { TagService } from '../../../services/tagService';
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
  }, [allTags, detailTag]);

  return (
    <div className="p-6 space-y-4 nb-bg">
      {/* 顶部工具栏 - 紧凑布局 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-xl nb-text">label</span>
          <h1 className="text-xl font-bold nb-text">{t('tags.title')}</h1>
        </div>
        
        {/* 内联统计数据 */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-[color:var(--nb-accent-yellow)] border-2 border-[color:var(--nb-border)]">
            <span className="material-symbols-outlined text-sm nb-text">label</span>
            <span className="text-sm font-bold nb-text">{statistics?.totalTags ?? 0}</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-[color:var(--nb-accent-blue)] border-2 border-[color:var(--nb-border)]">
            <span className="material-symbols-outlined text-sm nb-text">bookmark</span>
            <span className="text-sm font-bold nb-text">{statistics?.totalItems ?? 0}</span>
          </div>
          {(statistics?.unusedTags ?? 0) > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-[color:var(--nb-accent-pink)] border-2 border-[color:var(--nb-border)]">
              <span className="material-symbols-outlined text-sm nb-text">label_off</span>
              <span className="text-sm font-bold nb-text">{statistics?.unusedTags ?? 0}</span>
            </div>
          )}
        </div>
      </div>

      {/* 热门标签 - 紧凑单行 */}
      {statistics?.topTags && statistics.topTags.length > 0 && (
        <div className="flex items-center gap-3 py-2 border-b border-[color:var(--nb-border)]/20">
          <span className="text-xs font-bold nb-text-secondary uppercase">{t('tags.topTags')}:</span>
          <div className="flex flex-wrap gap-2">
            {statistics.topTags.slice(0, 8).map((tag, index) => (
              <span
                key={tag.name}
                className={`inline-flex items-center px-2 py-0.5 text-xs font-medium border-2 border-[color:var(--nb-border)] ${
                  ['bg-[color:var(--nb-accent-yellow)]', 'bg-[color:var(--nb-accent-pink)]', 'bg-[color:var(--nb-accent-blue)]', 'bg-[color:var(--nb-accent-green)]'][index % 4]
                }`}
              >
                {tag.name} <span className="ml-1 opacity-60">({tag.count})</span>
              </span>
            ))}
          </div>
        </div>
      )}

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
