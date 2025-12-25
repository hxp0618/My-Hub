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
