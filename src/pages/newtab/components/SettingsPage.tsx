import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import GeneralSettings from './GeneralSettings';
import LLMSettings from './LLMSettings';

interface SettingsPageProps {
  onClose: () => void;
}

const SettingsPage: React.FC<SettingsPageProps> = ({ onClose }) => {
  const { t } = useTranslation();
  const [activeMenu, setActiveMenu] = useState('LLM');

  return (
    <div className="flex h-[60vh]">
      {/* Neo-Brutalism 风格侧边导航 */}
      <nav className="w-48 border-r-[length:var(--nb-border-width)] border-[color:var(--nb-border)] pr-6">
        <ul className="space-y-2">
          <li>
            <button
              onClick={() => setActiveMenu('General')}
              className={`nb-settings-nav-item w-full flex items-center py-2 px-4 rounded-lg text-sm font-semibold transition-all duration-200 border-[length:var(--nb-border-width)] ${
                activeMenu === 'General'
                  ? 'bg-[color:var(--nb-border)] text-[color:var(--nb-card)] border-[color:var(--nb-border)]'
                  : 'text-[color:var(--nb-text)] bg-transparent border-transparent hover:bg-[color:var(--nb-card)] hover:border-[color:var(--nb-border)]'
              }`}
            >
              {t('settings.general')}
            </button>
          </li>
          <li>
            <button
              onClick={() => setActiveMenu('LLM')}
              className={`nb-settings-nav-item w-full flex items-center py-2 px-4 rounded-lg text-sm font-semibold transition-all duration-200 border-[length:var(--nb-border-width)] ${
                activeMenu === 'LLM'
                  ? 'bg-[color:var(--nb-border)] text-[color:var(--nb-card)] border-[color:var(--nb-border)]'
                  : 'text-[color:var(--nb-text)] bg-transparent border-transparent hover:bg-[color:var(--nb-card)] hover:border-[color:var(--nb-border)]'
              }`}
            >
              {t('settings.llm')}
            </button>
          </li>
        </ul>
      </nav>
      <main className="flex-1 pl-6 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto pr-2">
          {activeMenu === 'General' && <GeneralSettings />}
          {activeMenu === 'LLM' && <LLMSettings />}
        </div>
      </main>
    </div>
  );
};

export default SettingsPage;
