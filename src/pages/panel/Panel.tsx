import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import '@pages/panel/Panel.css';

export default function Panel() {
  const { t } = useTranslation();

  useEffect(() => {
    document.title = t('panel.title');
  }, [t]);

  return (
    <div className="nb-bg nb-text min-h-screen p-6 nb-bg-grid">
      <div className="mx-auto max-w-4xl space-y-6">
        <header className="nb-card nb-bg-halftone p-6 md:p-8 relative overflow-hidden">
          <div className="absolute -top-6 -left-6 w-16 h-16 bg-[color:var(--nb-deco-mint)] border-2 border-[color:var(--nb-border)] opacity-60 nb-float" aria-hidden="true" />
          <div className="absolute -bottom-8 -right-8 w-20 h-20 bg-[color:var(--nb-deco-rose)] border-2 border-[color:var(--nb-border)] opacity-60 nb-sticker-1" aria-hidden="true" />
          <div className="absolute right-6 bottom-4 text-5xl md:text-7xl nb-title-stroke opacity-20 pointer-events-none text-right leading-none max-w-[60%]">
            {t('panel.title')}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span className="nb-badge nb-badge-blue nb-sticker-2">{t('panel.title')}</span>
            <div className="nb-divider flex-1 h-[3px]" aria-hidden="true" />
          </div>
          <h1 className="mt-4 text-3xl md:text-4xl font-black uppercase tracking-tight">
            {t('panel.title')}
          </h1>
          <p className="mt-4 text-sm md:text-base nb-text-secondary leading-relaxed">
            {t('panel.description')}
          </p>
        </header>

        <section className="nb-card-static p-6 md:p-8 nb-bg-halftone relative overflow-hidden">
          <div className="absolute top-4 right-4 w-4 h-4 bg-[color:var(--nb-deco-sand)] border-2 border-[color:var(--nb-border)] nb-sticker-3" aria-hidden="true" />
          <div className="text-sm md:text-base font-bold uppercase tracking-wide nb-text">
            {t('panel.description')}
          </div>
        </section>
      </div>
    </div>
  );
}
