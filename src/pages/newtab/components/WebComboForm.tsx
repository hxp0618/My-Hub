import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { WebCombo } from '../types';

interface WebComboFormProps {
  combo?: WebCombo | null;
  onSave: (combo: Omit<WebCombo, 'id'> & { id?: string }) => void;
  onCancel: () => void;
}

const WebComboForm: React.FC<WebComboFormProps> = ({ combo, onSave, onCancel }) => {
  const { t } = useTranslation();
  const [title, setTitle] = useState('');
  const [urls, setUrls] = useState(['']);

  useEffect(() => {
    if (combo) {
      setTitle(combo.title);
      setUrls(combo.urls.length > 0 ? combo.urls : ['']);
    }
  }, [combo]);

  const handleUrlChange = (index: number, value: string) => {
    const newUrls = [...urls];
    newUrls[index] = value;
    setUrls(newUrls);
  };

  const addUrlInput = () => {
    setUrls([...urls, '']);
  };

  const removeUrlInput = (index: number) => {
    const newUrls = urls.filter((_, i) => i !== index);
    setUrls(newUrls);
  };

  const handleSave = () => {
    const comboToSave = {
      title,
      urls: urls.filter(url => url.trim() !== ''),
    };
    if (combo && combo.id) {
        onSave({ ...comboToSave, id: combo.id });
    } else {
        onSave(comboToSave);
    }
  };

  return (
    <div className="space-y-6 nb-text">
      <div>
        <label htmlFor="combo-title" className="block text-sm font-semibold nb-text">
          {t('home.comboTitle')}
        </label>
        <input
          type="text"
          id="combo-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="mt-2 nb-input w-full"
          placeholder={t('home.comboTitlePlaceholder')}
        />
      </div>

      <div>
        <label className="block text-sm font-semibold nb-text">{t('home.comboUrls')}</label>
        <div className="space-y-2 mt-2">
          {urls.map((url, index) => (
            <div key={index} className="flex items-center gap-2">
              <input
                type="text"
                value={url}
                onChange={(e) => handleUrlChange(index, e.target.value)}
                className="nb-input w-full"
                placeholder={t('home.comboUrlPlaceholder')}
              />
              <button
                onClick={() => removeUrlInput(index)}
                className="nb-btn nb-btn-secondary p-2 min-w-[42px]"
                disabled={urls.length === 1}
              >
                <span className="material-symbols-outlined icon-linear text-lg">delete</span>
              </button>
            </div>
          ))}
        </div>
        <button
          onClick={addUrlInput}
          className="mt-2 inline-flex items-center text-sm nb-btn nb-btn-secondary px-3 py-1"
        >
          <span className="material-symbols-outlined icon-linear text-lg mr-1">add</span>
          {t('home.addUrl')}
        </button>
      </div>

      <div className="flex justify-end space-x-4">
        <button
          onClick={onCancel}
          className="nb-btn nb-btn-secondary px-5 py-2"
        >
          {t('common.cancel')}
        </button>
        <button
          onClick={handleSave}
          className="nb-btn nb-btn-primary px-5 py-2"
        >
          {t('common.save')}
        </button>
      </div>
    </div>
  );
};

export default WebComboForm;
