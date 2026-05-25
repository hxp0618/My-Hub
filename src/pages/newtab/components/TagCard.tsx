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
      className={`nb-card-static p-4 cursor-pointer hover:shadow-[2px_2px_0px_0px_var(--nb-border)] transition-all ${isSelected ? 'bg-[color:var(--nb-accent-yellow)]/30' : ''}`}
      onClick={handleCardClick}
    >
      <div className="flex items-center gap-3">
        {isMultiSelectMode && (
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onToggleSelect(tag.name)}
            onClick={e => e.stopPropagation()}
            className="h-4 w-4 border-2 border-[color:var(--nb-border)] accent-[color:var(--nb-accent-yellow)] cursor-pointer"
          />
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold nb-text truncate">{tag.name}</h3>
            <span className="px-2 py-0.5 text-xs bg-[color:var(--nb-accent-blue)] border border-[color:var(--nb-border)] nb-text">
              {tag.count}
            </span>
          </div>
        </div>

        {!isMultiSelectMode && (
          <div className="flex items-center gap-1">
            <button
              className="p-1.5 hover:bg-[color:var(--nb-accent-yellow)] border border-transparent hover:border-[color:var(--nb-border)] transition-all"
              onClick={e => {
                e.stopPropagation();
                onRename(tag);
              }}
              aria-label={t('tags.rename')}
            >
              <span className="material-symbols-outlined text-base nb-text">edit</span>
            </button>
            <button
              className="p-1.5 hover:bg-[color:var(--nb-accent-pink)] border border-transparent hover:border-[color:var(--nb-border)] transition-all"
              onClick={e => {
                e.stopPropagation();
                onDelete(tag);
              }}
              aria-label={t('tags.delete')}
            >
              <span className="material-symbols-outlined text-base nb-text">delete</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
