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
    <div className="tag-list-panel">
      {/* 工具栏 - 紧凑布局 */}
      <div className="tag-list-toolbar nb-card-static">
        {/* 搜索框 */}
        <div className="tag-list-search">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-base nb-text-secondary">search</span>
          <input
            type="text"
            value={searchTerm}
            onChange={e => onSearchChange(e.target.value)}
            placeholder={t('tags.searchPlaceholder')}
            className="nb-input w-full pr-4 py-2 text-sm"
            style={{ paddingLeft: '2.5rem' }}
            aria-label={t('tags.search')}
          />
        </div>

        {/* 排序选择器 */}
        <select
          value={sortBy}
          onChange={e => onSortChange(e.target.value as TagSortBy)}
          className="tag-list-sort nb-input px-3 py-2 text-sm"
          aria-label={t('tags.sortBy')}
        >
          <option value="name">{t('tags.sortByName')}</option>
          <option value="count">{t('tags.sortByCount')}</option>
          <option value="recent">{t('tags.sortByRecent')}</option>
        </select>

        {/* 多选模式按钮 */}
        <button
          type="button"
          className={`tag-list-multi-button nb-btn px-3 py-2 text-sm ${isMultiSelectMode ? 'nb-btn-primary' : 'nb-btn-secondary'}`}
          onClick={onToggleMultiSelect}
          aria-pressed={isMultiSelectMode}
        >
          <span className="material-symbols-outlined text-sm mr-1">checklist</span>
          {isMultiSelectMode ? t('tags.exitMultiSelect') : t('tags.multiSelectMode')}
        </button>
      </div>

      {/* 多选操作栏 - 紧凑版 */}
      {isMultiSelectMode && (
        <div className="tag-list-selection-bar">
          <span className="text-sm font-bold nb-text">
            {t('tags.selectedCount', { count: selectedTags.length })}
          </span>
          <button type="button" className="tag-list-link-button nb-text" onClick={onSelectAll}>
            {t('tags.selectAll')}
          </button>
          <button type="button" className="tag-list-link-button nb-text" onClick={onClearSelection}>
            {t('tags.clearSelection')}
          </button>
          <div className="tag-list-selection-actions">
            <button
              type="button"
              className="nb-btn nb-btn-info px-3 py-1.5 text-sm"
              onClick={onMergeSelected}
              disabled={selectedTags.length < 2}
            >
              <span className="material-symbols-outlined text-sm mr-1">merge</span>
              {t('tags.merge')}
            </button>
            <button
              type="button"
              className="nb-btn nb-btn-danger px-3 py-1.5 text-sm"
              onClick={onDeleteSelected}
              disabled={selectedTags.length === 0}
            >
              <span className="material-symbols-outlined text-sm mr-1">delete</span>
              {t('tags.delete')}
            </button>
          </div>
        </div>
      )}

      {/* 加载状态 */}
      {loading && (
        <div className="tag-list-loading">
          <div className="w-8 h-8 border-2 border-[color:var(--nb-border)]/20 border-t-[color:var(--nb-accent-yellow)] animate-spin"></div>
        </div>
      )}

      {/* 空状态 */}
      {!loading && !hasTags && (
        <div className="tag-list-empty nb-card-static">
          <span className="material-symbols-outlined text-4xl nb-text-secondary mb-2">label_off</span>
          <div className="text-base nb-text-secondary">
            {searchTerm ? t('tags.noResults') : t('tags.noTags')}
          </div>
        </div>
      )}

      <div className="tag-list-grid">
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
