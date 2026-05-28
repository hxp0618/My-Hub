import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import GeneralSettings from './GeneralSettings';
import LLMSettings from './LLMSettings';

interface SettingsPageProps {
  onClose: () => void;
}

type SettingsMenu = 'General' | 'LLM';

const SETTINGS_MENUS: Array<{ id: SettingsMenu; icon: string; labelKey: string }> = [
  { id: 'General', icon: 'tune', labelKey: 'settings.general' },
  { id: 'LLM', icon: 'psychology', labelKey: 'settings.llm' },
];

const SettingsPage: React.FC<SettingsPageProps> = () => {
  const { t } = useTranslation();
  const [activeMenu, setActiveMenu] = useState<SettingsMenu>('LLM');

  return (
    <div className="settings-page-shell">
      {/* Neo-Brutalism 风格侧边导航 */}
      <nav className="settings-page-nav" aria-label={t('sidebar.settings')}>
        {/* 导航标题 */}
        <div className="settings-page-nav-header">
          <div className="settings-page-nav-title">
            <div className="settings-page-nav-icon">
              <span className="material-symbols-outlined text-base nb-text" aria-hidden="true">tune</span>
            </div>
            <h3 className="text-sm font-black nb-text uppercase">{t('sidebar.settings')}</h3>
          </div>
        </div>

        <ul className="settings-page-nav-list">
          {SETTINGS_MENUS.map((menu) => (
            <li key={menu.id}>
              <button
                type="button"
                onClick={() => setActiveMenu(menu.id)}
                className={`settings-page-nav-button nb-settings-nav-item ${activeMenu === menu.id ? 'active' : ''}`}
                aria-current={activeMenu === menu.id ? 'page' : undefined}
              >
                <span className="material-symbols-outlined text-base" aria-hidden="true">{menu.icon}</span>
                <span>{t(menu.labelKey)}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <main className="settings-page-content" aria-live="polite">
        {activeMenu === 'General' && <GeneralSettings />}
        {activeMenu === 'LLM' && <LLMSettings />}
      </main>
    </div>
  );
};

export default SettingsPage;
