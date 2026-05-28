import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import BookmarkTree from '../../../components/BookmarkTree';
import TagInput from '../../../components/TagInput';
import { Modal } from '../../../components/Modal';
import { EnhancedBookmark } from '../../../types/bookmarks';
import { useBookmarkTagGeneration } from '../hooks/useBookmarkTagGeneration';
import { autoSuggestBookmark } from '../../../utils/storageManager';

export const BookmarkEditModal: React.FC<{
  item: EnhancedBookmark;
  onClose: () => void;
  onSave: (id: string, newTitle: string, newUrl: string, newTags: string[], newParentId: string) => void;
}> = ({ item, onClose, onSave }) => {
  const { t } = useTranslation();
  const [title, setTitle] = useState(item.title);
  const [url, setUrl] = useState(item.url || '');
  const [tags, setTags] = useState(item.tags || []);
  const [parentId, setParentId] = useState(item.parentId || '1');
  const hasAutoSuggestedRef = useRef(false);
  const {
    isGeneratingTags: isGenerating,
    generationStatusMessage: statusMessage,
    generateTags,
    cancelTagGeneration: handleCancelGeneration,
  } = useBookmarkTagGeneration({
    clearAfterMs: null,
    cancelClearAfterMs: null,
  });

  const handleGenerateTags = useCallback(() => {
    void generateTags({
      title,
      url,
      displayTitle: title,
      onTagsGenerated: setTags,
      successMessage: generatedTags => t('tagGeneration.successMessage', { count: generatedTags.length }),
    });
  }, [generateTags, t, title, url]);

  useEffect(() => {
    const autoSuggestEnabled = autoSuggestBookmark.get();
    if (autoSuggestEnabled && title && url && !hasAutoSuggestedRef.current) {
      hasAutoSuggestedRef.current = true;
      handleGenerateTags();
    }
    // Keep this one-shot behavior aligned with AddBookmarkForm auto suggestions.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = () => {
    onSave(item.id, title, url, tags, parentId);
    onClose();
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={t('bookmarks.editBookmark')}
      widthClass="max-w-lg"
    >
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium nb-text-secondary">{t('bookmarks.title_label')}</label>
          <input type="text" value={title} onChange={e => setTitle(e.target.value)} className="nb-input w-full mt-1" />
        </div>
        <div>
          <label className="text-sm font-medium nb-text-secondary">{t('bookmarks.url_label')}</label>
          <input type="text" value={url} onChange={e => setUrl(e.target.value)} className="nb-input w-full mt-1" />
        </div>
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium nb-text-secondary">{t('bookmarks.tags_label')}</label>
            {isGenerating ? (
              <button
                type="button"
                onClick={handleCancelGeneration}
                className="nb-btn nb-btn-danger px-3 py-1 text-xs"
              >
                {t('bookmarks.cancel_generate')}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleGenerateTags()}
                disabled={!title || !url}
                className="nb-btn nb-btn-primary px-3 py-1 text-xs"
              >
                {t('bookmarks.generateAI')}
              </button>
            )}
          </div>
          <TagInput tags={tags} setTags={setTags} />
          {statusMessage && (
            <p className="mt-2 text-xs nb-text-secondary">{statusMessage}</p>
          )}
        </div>
        <div>
          <label className="text-sm font-medium nb-text-secondary">{t('bookmarks.folder_label')}</label>
          <BookmarkTree selectedFolder={parentId} setSelectedFolder={setParentId} />
        </div>
      </div>
      <div className="flex justify-end space-x-4 mt-8">
        <button type="button" onClick={onClose} className="nb-btn nb-btn-secondary px-5 py-2">{t('common.cancel')}</button>
        <button type="button" onClick={handleSave} className="nb-btn nb-btn-primary px-5 py-2">{t('common.save')}</button>
      </div>
    </Modal>
  );
};
