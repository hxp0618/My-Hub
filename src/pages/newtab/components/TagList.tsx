import React from 'react';
import { useTranslation } from 'react-i18next';
import { TagInfo, TagSortBy } from '../../../types/tags';
import { TagCard } from './TagCard';

interface TagListProps {
  tags: TagInfo[];
  loading: boolean;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  sortBy: TagSortBy;
  onSortChange: (value: TagSortBy) => void;
  isMultiSelectMode: boolean;
  onToggleMultiSelect: () => void;
  selectedTags: string[];
  onToggleTagSelection: (tagName: string) => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onViewDetails: (tag: TagInfo) => void;
  onRename: (tag: TagInfo) => void;
  onDelete: (tag: TagInfo) => void;
  onMergeSelected: () => void;
  onDeleteSelected: () => void;
}

export const TagList: React.FC<TagListProps> = ({
  tags,
  loading,
  searchTerm,
  onSearchChange,
  sortBy,
  onSortChange,
  isMultiSelectMode,
  onToggleMultiSelect,
  selectedTags,
  onToggleTagSelection,
  onSelectAll,
  onClearSelection,
  onViewDetails,
  onRename,
  onDelete,
  onMergeSelected,
  onDeleteSelected,
}) => {
  const { t } = useTranslation();

  const hasTags = tags.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-4 items-center">
        <div className="flex-1 min-w-[240px]">
          <div className="relative">
            <span className="material-symbols-outlined icon-linear absolute left-3 top-1/2 -translate-y-1/2 nb-text-secondary">
              search
            </span>
            <input
              type="text"
              value={searchTerm}
              onChange={e => onSearchChange(e.target.value)}
              placeholder={t('tags.searchPlaceholder')}
              className="nb-input w-full pl-10 pr-4 py-2 rounded-full"
            />
          </div>
        </div>
        <div className="flex items-center">
          <label className="text-sm nb-text-secondary mr-2">{t('tags.sortBy')}</label>
          <select
            value={sortBy}
            onChange={e => onSortChange(e.target.value as TagSortBy)}
            className="nb-input px-4 py-2"
          >
            <option value="name">{t('tags.sortByName')}</option>
            <option value="count">{t('tags.sortByCount')}</option>
            <option value="recent">{t('tags.sortByRecent')}</option>
          </select>
        </div>
        <button
          className={`nb-btn px-4 py-2 ${
            isMultiSelectMode ? 'nb-btn-primary' : 'nb-btn-secondary'
          }`}
          onClick={onToggleMultiSelect}
        >
          {isMultiSelectMode ? t('tags.exitMultiSelect') : t('tags.multiSelectMode')}
        </button>
      </div>

      {isMultiSelectMode && (
        <div className="flex flex-wrap items-center gap-3 nb-card-static px-4 py-3">
          <span className="text-sm font-medium nb-text">
            {t('tags.selectedCount', { count: selectedTags.length })}
          </span>
          <button className="nb-btn nb-btn-ghost text-sm px-3 py-1" onClick={onSelectAll}>
            {t('tags.selectAll')}
          </button>
          <button className="nb-btn nb-btn-ghost text-sm px-3 py-1" onClick={onClearSelection}>
            {t('tags.clearSelection')}
          </button>
          <div className="flex items-center gap-2 ml-auto">
            <button
              className="nb-btn nb-btn-secondary px-4 py-2 text-sm disabled:opacity-50"
              onClick={onMergeSelected}
              disabled={selectedTags.length < 2}
            >
              {t('tags.merge')}
            </button>
            <button
              className="nb-btn nb-btn-danger px-4 py-2 text-sm disabled:opacity-50"
              onClick={onDeleteSelected}
              disabled={selectedTags.length === 0}
            >
              {t('tags.delete')}
            </button>
          </div>
        </div>
      )}

      {loading && (
        <div className="text-secondary">{t('common.loading')}</div>
      )}

      {!loading && !hasTags && (
        <div className="text-center py-12 nb-card-static border-dashed">
          <div className="text-lg font-semibold nb-text mb-2">
            {searchTerm ? t('tags.noResults') : t('tags.noTags')}
          </div>
          <div className="nb-text-secondary">
            {searchTerm ? t('tags.noResults') : t('tags.selectedModeHint')}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {tags.map(tag => (
          <TagCard
            key={tag.name}
            tag={tag}
            isMultiSelectMode={isMultiSelectMode}
            isSelected={selectedTags.includes(tag.name)}
            onToggleSelect={onToggleTagSelection}
            onViewDetails={onViewDetails}
            onRename={onRename}
            onDelete={onDelete}
          />
        ))}
      </div>
    </div>
  );
};
