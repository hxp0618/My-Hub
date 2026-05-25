import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import GeneralSettings from './GeneralSettings';
import LLMSettings from './LLMSettings';

interface SettingsPageProps {
  onClose: () => void;
}

const SettingsPage: React.FC<SettingsPageProps> = () => {
  const { t } = useTranslation();
  const [activeMenu, setActiveMenu] = useState('LLM');

  return (
    <div className="flex h-[60vh] relative overflow-hidden">
      {/* 装饰性背景元素 */}
      <div className="absolute -top-8 -left-8 w-24 h-24 bg-[color:var(--nb-accent-blue)]/10 border-2 border-[color:var(--nb-border)]/20 rounded-full nb-float pointer-events-none"></div>
      <div className="absolute -bottom-6 -right-6 w-20 h-20 bg-[color:var(--nb-accent-pink)]/10 border-3 border-[color:var(--nb-border)]/20 nb-sticker-2 pointer-events-none" style={{ borderRadius: '40% 60% 70% 30% / 40% 50% 60% 50%' }}></div>

      {/* Neo-Brutalism 风格侧边导航 */}
      <nav className="w-48 border-r-[length:var(--nb-border-width)] border-[color:var(--nb-border)] pr-6 relative z-10">
        {/* 导航标题 */}
        <div className="mb-4 pb-3 border-b-2 border-[color:var(--nb-border)]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 flex items-center justify-center bg-[color:var(--nb-accent-yellow)] border-2 border-[color:var(--nb-border)] shadow-[2px_2px_0px_0px_var(--nb-border)]">
              <span className="material-symbols-outlined text-base nb-text">tune</span>
            </div>
            <h3 className="text-sm font-black nb-text uppercase tracking-tight">{t('sidebar.settings')}</h3>
          </div>
        </div>

        <ul className="space-y-2">
          <li>
            <button
              onClick={() => setActiveMenu('General')}
              className={`nb-settings-nav-item w-full ${activeMenu === 'General' ? 'active' : ''}`}
            >
              {t('settings.general')}
            </button>
          </li>
          <li>
            <button
              onClick={() => setActiveMenu('LLM')}
              className={`nb-settings-nav-item w-full ${activeMenu === 'LLM' ? 'active' : ''}`}
            >
              {t('settings.llm')}
            </button>
          </li>
        </ul>
      </nav>
      <main className="flex-1 pl-6 flex flex-col overflow-hidden relative z-10">
        {/* 内容区装饰 */}
        <div className="absolute top-2 right-2 w-10 h-10 bg-[color:var(--nb-accent-green)]/20 border-2 border-[color:var(--nb-border)]/30 nb-rotate-slow pointer-events-none" style={{ clipPath: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)' }}></div>

        <div className="flex-1 overflow-y-auto pr-2">
          {activeMenu === 'General' && <GeneralSettings />}
          {activeMenu === 'LLM' && <LLMSettings />}
        </div>
      </main>
    </div>
  );
};

export default SettingsPage;
