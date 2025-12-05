import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from '../../../components/Modal';
import { TagInfo } from '../../../types/tags';
import { getTagClassName } from '../../../utils/tagColorUtils';

interface MergeTagsDialogProps {
  tags: TagInfo[];
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (newName: string, deleteOld: boolean) => Promise<void> | void;
}

export const MergeTagsDialog: React.FC<MergeTagsDialogProps> = ({
  tags,
  isOpen,
  onClose,
  onConfirm,
}) => {
  const { t } = useTranslation();
  const [newName, setNewName] = useState('');
  const [deleteOld, setDeleteOld] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && tags.length > 0) {
      setNewName(tags[0].name);
    }
  }, [isOpen, tags]);

  const handleSubmit = async () => {
    if (!newName.trim()) return;
    setSubmitting(true);
    try {
      await onConfirm(newName.trim(), deleteOld);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('tags.mergeTags')} widthClass="max-w-lg">
      <div className="space-y-4">
        <div className="text-sm nb-text-secondary">
          {t('tags.confirmMerge', { count: tags.length, newName })}
        </div>
        <div className="flex flex-wrap gap-2">
          {tags.map((tag, index) => (
            <span key={tag.name} className={getTagClassName(index)}>
              {tag.name}
            </span>
          ))}
        </div>
        <div>
          <label className="block text-sm font-medium nb-text-secondary mb-1">{t('tags.newTagName')}</label>
          <input
            type="text"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            className="nb-input w-full"
            placeholder={t('tags.newTagName')}
          />
        </div>
        <label className="flex items-center gap-2 text-sm nb-text-secondary">
          <input
            type="checkbox"
            checked={deleteOld}
            onChange={e => setDeleteOld(e.target.checked)}
            className="w-4 h-4 rounded border-[length:var(--nb-border-width)] border-[color:var(--nb-border)] accent-[color:var(--nb-accent-yellow)]"
          />
          {t('tags.deleteOldTags')}
        </label>
        <div className="flex justify-end gap-3">
          <button className="nb-btn nb-btn-secondary px-4 py-2" onClick={onClose}>
            {t('common.cancel')}
          </button>
          <button
            className="nb-btn nb-btn-primary px-4 py-2 disabled:opacity-50"
            onClick={handleSubmit}
            disabled={submitting || !newName.trim() || tags.length < 2}
          >
            {submitting ? t('common.loading') : t('tags.merge')}
          </button>
        </div>
      </div>
    </Modal>
  );
};
