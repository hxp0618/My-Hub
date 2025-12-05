import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import '@pages/panel/Panel.css';

export default function Panel() {
  const { t } = useTranslation();

  useEffect(() => {
    document.title = t('panel.title');
  }, [t]);

  return (
    <div className="nb-bg nb-text min-h-screen p-6">
      <div className="nb-card-static p-6 space-y-3">
        <h1 className="text-2xl font-bold">{t('panel.title')}</h1>
        <p className="text-sm nb-text-secondary">{t('panel.description')}</p>
      </div>
    </div>
  );
}
