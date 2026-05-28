import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import TagInput from '../../../components/TagInput';
import BookmarkTree from '../../../components/BookmarkTree';
import { EnhancedBookmark } from '../../../types/bookmarks';

export const ReorderConfirmModal: React.FC<{
  onClose: () => void;
  onConfirm: () => void;
  sortOrderText: string;
  isLoading: boolean;
}> = ({ onClose, onConfirm, sortOrderText, isLoading }) => {
  const { t } = useTranslation();
  return (
    <div className="fixed inset-0 modal-overlay flex items-center justify-center z-50">
      <div className="nb-card-static w-full max-w-lg p-8">
        <h3 className="text-lg font-bold mb-4 nb-text">{t('bookmarks.reorderTitle')}</h3>
        <p className="nb-text">{t('bookmarks.reorderMessage', { sortOrder: sortOrderText })}</p>
        <p className="text-sm nb-text-secondary mt-2">{t('bookmarks.reorderWarning')}</p>
        <div className="flex justify-end space-x-4 mt-8">
          <button onClick={onClose} className="nb-btn nb-btn-secondary px-5 py-2" disabled={isLoading}>{t('common.cancel')}</button>
          <button onClick={onConfirm} className="nb-btn nb-btn-primary px-5 py-2" disabled={isLoading}>
            {isLoading ? t('common.loading') : t('common.confirm')}
          </button>
        </div>
      </div>
    </div>
  );
};

export const DeduplicateModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  duplicates: { url: string; bookmarks: EnhancedBookmark[] }[];
  onConfirm: (bookmarksToDelete: string[]) => void;
}> = ({ isOpen, onClose, duplicates, onConfirm }) => {
  const { t } = useTranslation();
  const [selectedToKeep, setSelectedToKeep] = useState<Map<string, string>>(new Map());

  // Default to keeping the oldest bookmark in each duplicate group.
  useEffect(() => {
    if (duplicates.length > 0 && selectedToKeep.size === 0) {
      const initialSelection = new Map<string, string>();
      duplicates.forEach(({ url, bookmarks }) => {
        const oldest = bookmarks.reduce((prev, current) =>
          (prev.dateAdded || 0) < (current.dateAdded || 0) ? prev : current
        );
        initialSelection.set(url, oldest.id);
      });
      setSelectedToKeep(initialSelection);
    }
  }, [duplicates, selectedToKeep.size]);

  const handleConfirm = () => {
    const bookmarksToDelete: string[] = [];
    duplicates.forEach(({ url, bookmarks }) => {
      const keepId = selectedToKeep.get(url);
      bookmarks.forEach(bookmark => {
        if (bookmark.id !== keepId) {
          bookmarksToDelete.push(bookmark.id);
        }
      });
    });
    onConfirm(bookmarksToDelete);
  };

  if (!isOpen) return null;

  if (duplicates.length === 0) {
    return (
      <div className="fixed inset-0 modal-overlay flex items-center justify-center z-50">
        <div className="nb-card-static w-full max-w-2xl p-8">
          <h3 className="text-lg font-bold mb-4 nb-text">{t('bookmarks.deduplicateTitle')}</h3>
          <p className="nb-text-secondary mb-6">{t('bookmarks.noDuplicates')}</p>
          <div className="flex justify-end">
            <button onClick={onClose} className="nb-btn nb-btn-primary px-5 py-2">
              {t('common.close')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const totalDuplicates = duplicates.reduce((sum, { bookmarks }) => sum + bookmarks.length - 1, 0);

  return (
    <div className="fixed inset-0 modal-overlay flex items-center justify-center z-50">
      <div className="nb-card-static w-full max-w-4xl p-8 max-h-[80vh] overflow-y-auto">
        <h3 className="text-lg font-bold mb-2 nb-text">{t('bookmarks.deduplicateTitle')}</h3>
        <p className="nb-text-secondary mb-6">
          {t('bookmarks.deduplicateMessage', { count: totalDuplicates, groups: duplicates.length })}
        </p>

        <div className="space-y-6 mb-6">
          {duplicates.map(({ url, bookmarks }) => (
            <div key={url} className="nb-card-static p-4">
              <div className="font-medium mb-3 truncate nb-text" title={url}>{url}</div>
              <div className="space-y-2">
                {bookmarks.map(bookmark => (
                  <label
                    key={bookmark.id}
                    className="flex items-center gap-3 p-3 nb-bg-card border-2 border-[color:var(--nb-border)] cursor-pointer hover:bg-[color:var(--nb-bg)] hover:shadow-[2px_2px_0px_0px_var(--nb-shadow-color)] transition-all duration-150"
                  >
                    <input
                      type="radio"
                      name={`duplicate-${url}`}
                      checked={selectedToKeep.get(url) === bookmark.id}
                      onChange={() => {
                        const newSelection = new Map(selectedToKeep);
                        newSelection.set(url, bookmark.id);
                        setSelectedToKeep(newSelection);
                      }}
                      className="w-4 h-4 accent-[color:var(--nb-accent-yellow)]"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate nb-text">{bookmark.title}</div>
                      <div className="text-sm nb-text-secondary">
                        {bookmark.dateAdded && new Date(bookmark.dateAdded).toLocaleDateString()}
                        {bookmark.parentId && ` • ${t('bookmarks.folder_label')}`}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end space-x-4">
          <button onClick={onClose} className="nb-btn nb-btn-secondary px-5 py-2">
            {t('common.cancel')}
          </button>
          <button onClick={handleConfirm} className="nb-btn nb-btn-danger px-5 py-2">
            {t('bookmarks.deleteNDuplicates', { count: totalDuplicates })}
          </button>
        </div>
      </div>
    </div>
  );
};

export const AddTagsModal: React.FC<{
  onClose: () => void;
  onSave: (tags: string[]) => void;
}> = ({ onClose, onSave }) => {
  const { t } = useTranslation();
  const [tags, setTags] = useState<string[]>([]);

  return (
    <div className="fixed inset-0 modal-overlay flex items-center justify-center z-50">
      <div className="nb-card-static w-full max-w-lg p-8">
        <h3 className="text-lg font-bold mb-6 nb-text">{t('bookmarks.addTags')}</h3>
        <TagInput tags={tags} setTags={setTags} />
        <div className="flex justify-end space-x-4 mt-8">
          <button onClick={onClose} className="nb-btn nb-btn-secondary px-5 py-2">{t('common.cancel')}</button>
          <button onClick={() => onSave(tags)} className="nb-btn nb-btn-primary px-5 py-2">{t('common.save')}</button>
        </div>
      </div>
    </div>
  );
};

export const MoveBookmarksModal: React.FC<{
  onClose: () => void;
  onMove: (targetParentId: string) => void;
}> = ({ onClose, onMove }) => {
  const { t } = useTranslation();
  const [targetId, setTargetId] = useState('1');

  return (
    <div className="fixed inset-0 modal-overlay flex items-center justify-center z-50">
      <div className="nb-card-static w-full max-w-lg p-8">
        <h3 className="text-lg font-bold mb-6 nb-text">{t('bookmarks.moveTo')}</h3>
        <BookmarkTree selectedFolder={targetId} setSelectedFolder={setTargetId} />
        <div className="flex justify-end space-x-4 mt-8">
          <button onClick={onClose} className="nb-btn nb-btn-secondary px-5 py-2">{t('common.cancel')}</button>
          <button onClick={() => onMove(targetId)} className="nb-btn nb-btn-primary px-5 py-2">{t('actions.move')}</button>
        </div>
      </div>
    </div>
  );
};
