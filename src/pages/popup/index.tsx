import React from 'react';
import { createRoot } from 'react-dom/client';
import '@pages/popup/index.css';
import '@assets/styles/tailwind.css';
import AddBookmarkForm from '@src/pages/newtab/components/AddBookmarkForm';
import { ThemeProvider } from '@src/contexts/ThemeContext';
import { useTranslation } from 'react-i18next';
import '../../i18n'; // 初始化 i18n

const PopupApp = () => {
  const { t } = useTranslation();

  return (
    <div className="nb-bg nb-text min-h-screen p-4 nb-bg-grid">
      <div className="nb-card p-4 relative overflow-hidden nb-bg-halftone">
        <div className="absolute -top-4 -right-4 w-14 h-14 bg-[color:var(--nb-accent-yellow)] border-2 border-[color:var(--nb-border)] opacity-30 nb-rotate-slow" aria-hidden="true" />
        <div className="absolute -bottom-6 -left-6 w-16 h-16 bg-[color:var(--nb-accent-blue)] border-2 border-[color:var(--nb-border)] opacity-20 nb-sticker-2" style={{ borderRadius: '30% 70% 70% 30% / 30% 30% 70% 70%' }} aria-hidden="true" />
        <div className="absolute right-4 bottom-4 text-4xl nb-title-stroke opacity-20 pointer-events-none text-right leading-none max-w-[70%]">
          {t('modal.addBookmark')}
        </div>

        <div className="flex items-center gap-3 mb-4">
          <span className="nb-badge nb-badge-yellow nb-sticker-1">{t('modal.addBookmark')}</span>
          <div className="nb-divider flex-1 h-[3px]" aria-hidden="true" />
        </div>

        <AddBookmarkForm />
      </div>
    </div>
  );
};

function init() {
  const rootContainer = document.querySelector("#__root");
  if (!rootContainer) throw new Error("Can't find Popup root element");
  const root = createRoot(rootContainer);
  root.render(
    <ThemeProvider>
      <PopupApp />
    </ThemeProvider>
  );
}

init();
