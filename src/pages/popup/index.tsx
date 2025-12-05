import React from 'react';
import { createRoot } from 'react-dom/client';
import '@pages/popup/index.css';
import '@assets/styles/tailwind.css';
import AddBookmarkForm from '@src/pages/newtab/components/AddBookmarkForm';
import { ThemeProvider } from '@src/contexts/ThemeContext';
import '../../i18n'; // 初始化 i18n

function init() {
  const rootContainer = document.querySelector("#__root");
  if (!rootContainer) throw new Error("Can't find Popup root element");
  const root = createRoot(rootContainer);
  root.render(
    <ThemeProvider>
      <div className="nb-bg nb-text min-h-screen p-6">
        <AddBookmarkForm />
      </div>
    </ThemeProvider>
  );
}

init();
