import React from 'react';
import { createRoot } from 'react-dom/client';
import Newtab from '@pages/newtab/Newtab';
import '@pages/newtab/index.css';
import '@assets/styles/tailwind.css';
import { ThemeProvider } from '@src/contexts/ThemeContext';
import '../../i18n'; // 初始化 i18n

function init() {
  const rootContainer = document.querySelector("#__root");
  if (!rootContainer) throw new Error("Can't find Newtab root element");
  const root = createRoot(rootContainer);
  root.render(
    <ThemeProvider>
      <Newtab />
    </ThemeProvider>
  );
}

init();
