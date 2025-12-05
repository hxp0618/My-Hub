import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from '../../../components/Modal';
import { TagInfo } from '../../../types/tags';

interface RenameTagDialogProps {
  tag: TagInfo | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (newName: string) => Promise<void> | void;
}

export const RenameTagDialog: React.FC<RenameTagDialogProps> = ({
  tag,
  isOpen,
  onClose,
  onConfirm,
}) => {
  const { t } = useTranslation();
  const [newName, setNewName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setNewName(tag?.name ?? '');
  }, [tag]);

  const handleSubmit = async () => {
    if (!tag || !newName.trim()) return;
    setSubmitting(true);
    try {
      await onConfirm(newName.trim());
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('tags.renameTag')}>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium nb-text-secondary mb-1">{t('tags.newName')}</label>
          <input
            type="text"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            className="nb-input w-full"
            placeholder={t('tags.newTagName')}
          />
        </div>
        <div className="flex justify-end gap-3">
          <button className="nb-btn nb-btn-secondary px-4 py-2" onClick={onClose}>
            {t('common.cancel')}
          </button>
          <button
            className="nb-btn nb-btn-primary px-4 py-2 disabled:opacity-50"
            onClick={handleSubmit}
            disabled={!newName.trim() || submitting}
          >
            {submitting ? t('common.loading') : t('tags.rename')}
          </button>
        </div>
      </div>
    </Modal>
  );
};
