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

  return (
    <div
      className={`tag-card nb-card-data ${isSelected ? 'is-selected' : ''}`}
    >
      <div className="flex items-center gap-3">
        <button
          type="button"
          className="tag-card-main min-w-0 flex-1 text-left"
          onClick={handleCardClick}
          aria-pressed={isMultiSelectMode ? isSelected : undefined}
          aria-label={isMultiSelectMode
            ? t('tags.selectTag', { name: tag.name })
            : `${t('tags.viewDetails')} ${tag.name}`
          }
        >
          <span className="flex items-center gap-3">
            {isMultiSelectMode && (
              <span className={`flex h-5 w-5 items-center justify-center border-2 border-[color:var(--nb-border)] ${isSelected ? 'bg-[color:var(--nb-accent-yellow)]' : 'bg-[color:var(--nb-card)]'}`} aria-hidden="true">
                {isSelected && <span className="material-symbols-outlined text-sm">check</span>}
              </span>
            )}
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2">
                <span className="text-base font-bold nb-text truncate">{tag.name}</span>
                <span className="px-2 py-0.5 text-xs bg-[color:var(--nb-accent-blue)] border border-[color:var(--nb-border)] text-[color:var(--nb-text-on-accent)]">
                  {tag.count}
                </span>
              </span>
            </span>
          </span>
        </button>

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
              <span className="material-symbols-outlined text-base text-[color:inherit]" aria-hidden="true">edit</span>
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
              <span className="material-symbols-outlined text-base text-[color:inherit]" aria-hidden="true">delete</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
