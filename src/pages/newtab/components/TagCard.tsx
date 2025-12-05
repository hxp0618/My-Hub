import React from 'react';
import { useTranslation } from 'react-i18next';
import { TagInfo } from '../../../types/tags';
import { timeAgo } from '../utils';

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
      className={`nb-card relative p-5 cursor-pointer ${isSelected ? 'nb-selected' : ''}`}
      onClick={handleCardClick}
    >
      {isMultiSelectMode && (
        <div className="absolute top-4 left-4 z-10" onClick={e => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onToggleSelect(tag.name)}
            className="h-5 w-5 nb-border rounded-md bg-[color:var(--nb-card)] text-[color:var(--nb-border)] accent-[color:var(--nb-border)] cursor-pointer focus:outline-none focus:ring-0"
          />
        </div>
      )}

      <div className={`${isMultiSelectMode ? 'pl-8' : ''}`}>
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-sm nb-text-secondary uppercase tracking-wide">{t('tags.itemCount', { count: tag.count })}</div>
            <h3 className="text-xl font-semibold nb-text truncate">{tag.name}</h3>
          </div>
          {!isMultiSelectMode && (
            <div className="flex items-center gap-2">
              <button
                className="nb-btn-ghost p-2 rounded-full"
                onClick={e => {
                  e.stopPropagation();
                  onRename(tag);
                }}
                aria-label={t('tags.rename')}
              >
                <span className="material-symbols-outlined icon-linear text-lg">edit</span>
              </button>
              <button
                className="nb-btn-ghost p-2 rounded-full hover:text-danger"
                onClick={e => {
                  e.stopPropagation();
                  onDelete(tag);
                }}
                aria-label={t('tags.delete')}
              >
                <span className="material-symbols-outlined icon-linear text-lg">delete</span>
              </button>
            </div>
          )}
        </div>
        {tag.lastUsed && (
          <div className="text-sm nb-text-secondary mt-2">
            {t('tags.lastUsed')}: {timeAgo(tag.lastUsed)}
          </div>
        )}
        <div className="mt-4 flex items-center justify-between text-sm">
          <button
            className="nb-btn nb-btn-secondary px-4 py-2 text-sm"
            onClick={e => {
              e.stopPropagation();
              onViewDetails(tag);
            }}
          >
            {t('tags.viewDetails')}
          </button>
          {!isMultiSelectMode && (
            <span className="nb-text-secondary text-xs">{t('tags.statistics')}</span>
          )}
        </div>
      </div>
    </div>
  );
};
