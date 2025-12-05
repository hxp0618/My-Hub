import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import '@pages/options/Options.css';

export default function Options() {
  const { t } = useTranslation();

  useEffect(() => {
    document.title = t('options.title');
  }, [t]);

  return (
    <div className="nb-bg nb-text min-h-screen p-6">
      <div className="nb-card-static p-6 space-y-4">
        <h1 className="text-2xl font-bold">{t('options.title')}</h1>
        <p className="text-sm nb-text-secondary">{t('options.description')}</p>
      </div>
    </div>
  );
}
