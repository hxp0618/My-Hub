import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from '../../../components/Modal';
import { TagInfo } from '../../../types/tags';

interface DeleteTagDialogProps {
  tag: TagInfo | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
}

export const DeleteTagDialog: React.FC<DeleteTagDialogProps> = ({
  tag,
  isOpen,
  onClose,
  onConfirm,
}) => {
  const { t } = useTranslation();
  const [submitting, setSubmitting] = useState(false);

  const handleConfirm = async () => {
    if (!tag) return;
    setSubmitting(true);
    try {
      await onConfirm();
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('tags.deleteTag')}>
      <p className="text-sm nb-text-secondary mb-6">
        {tag
          ? t('tags.confirmDelete', { name: tag.name, count: tag.count })
          : ''}
      </p>
      <div className="flex justify-end gap-3">
        <button className="nb-btn nb-btn-secondary px-4 py-2" onClick={onClose}>
          {t('common.cancel')}
        </button>
        <button
          className="nb-btn nb-btn-danger px-4 py-2 disabled:opacity-50"
          onClick={handleConfirm}
          disabled={submitting}
        >
          {submitting ? t('common.loading') : t('tags.delete')}
        </button>
      </div>
    </Modal>
  );
};
