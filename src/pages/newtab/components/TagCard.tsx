import React from 'react';
import { useTranslation } from 'react-i18next';
import { TagInfo } from '../../../types/tags';

interface TagCardProps {
  tag: TagInfo;
  isMultiSelectMode: boolean;
  isSelected: boolean;
  onToggleSelect: (tagName: string) => void;
  onViewDetails: (tag: TagInfo) => void;
  onRename: (tag: TagInfo) => void;
  onDelete: (tag: TagInfo) => void;
}

export const TagCard: React.FC<TagCardProps> = ({
  tag,
  isMultiSelectMode,
  isSelected,
  onToggleSelect,
  onViewDetails,
  onRename,
  onDelete,
}) => {
  const { t } = useTranslation();

  const handleCardClick = () => {
    if (isMultiSelectMode) {
      onToggleSelect(tag.name);
      return;
    }
    onViewDetails(tag);
  };

  const handleCardKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    handleCardClick();
  };

  return (
    <div
      className={`tag-card nb-card-data ${isSelected ? 'is-selected' : ''}`}
      onClick={handleCardClick}
      onKeyDown={handleCardKeyDown}
      role="button"
      tabIndex={0}
      aria-pressed={isMultiSelectMode ? isSelected : undefined}
      aria-label={isMultiSelectMode
        ? t('tags.selectTag', { name: tag.name })
        : `${t('tags.viewDetails')} ${tag.name}`
      }
    >
      <div className="flex items-center gap-3">
        {isMultiSelectMode && (
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onToggleSelect(tag.name)}
            onClick={e => e.stopPropagation()}
            className="h-4 w-4 border-2 border-[color:var(--nb-border)] accent-[color:var(--nb-accent-yellow)] cursor-pointer"
            tabIndex={-1}
            aria-hidden="true"
          />
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold nb-text truncate">{tag.name}</h3>
            <span className="px-2 py-0.5 text-xs bg-[color:var(--nb-accent-blue)] border border-[color:var(--nb-border)] text-[color:var(--nb-text-on-accent)]">
              {tag.count}
            </span>
          </div>
        </div>

        {!isMultiSelectMode && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              className="tag-card-action hover:bg-[color:var(--nb-accent-yellow)]"
              onClick={e => {
                e.stopPropagation();
                onRename(tag);
              }}
              aria-label={`${t('tags.rename')} ${tag.name}`}
            >
              <span className="material-symbols-outlined text-base text-[color:inherit]">edit</span>
            </button>
            <button
              type="button"
              className="tag-card-action hover:bg-[color:var(--nb-accent-pink)]"
              onClick={e => {
                e.stopPropagation();
                onDelete(tag);
              }}
              aria-label={`${t('tags.delete')} ${tag.name}`}
            >
              <span className="material-symbols-outlined text-base text-[color:inherit]">delete</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
