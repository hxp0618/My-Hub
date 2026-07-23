import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import GeneralSettings from './GeneralSettings';
import LLMSettings from './LLMSettings';
import type { GeneralSettingsSection } from './GeneralSettings';

interface SettingsPageProps {
  onClose: () => void;
  initialMenu?: SettingsMenu;
}

export type SettingsMenu = 'General' | 'Notifications' | 'Permissions' | 'Data' | 'LLM';

const SETTINGS_LAST_MENU_KEY = 'myhub-settings-last-menu';

const isSettingsMenu = (value: unknown): value is SettingsMenu => (
  value === 'General' || value === 'Notifications' || value === 'Permissions' || value === 'Data' || value === 'LLM'
);

const SETTINGS_MENUS: Array<{ id: SettingsMenu; icon: string; labelKey: string }> = [
  { id: 'General', icon: 'tune', labelKey: 'settings.general' },
  { id: 'Notifications', icon: 'notifications', labelKey: 'settings.notificationMenu' },
  { id: 'Permissions', icon: 'shield', labelKey: 'settings.permissionsMenu' },
  { id: 'Data', icon: 'database', labelKey: 'settings.dataMenu' },
  { id: 'LLM', icon: 'psychology', labelKey: 'settings.llm' },
];

const getInitialMenu = (initialMenu?: SettingsMenu): SettingsMenu => {
  if (initialMenu) return initialMenu;
  const stored = localStorage.getItem(SETTINGS_LAST_MENU_KEY);
  return isSettingsMenu(stored) ? stored : 'General';
};

const SECTION_BY_MENU: Partial<Record<SettingsMenu, GeneralSettingsSection>> = {
  General: 'general',
  Notifications: 'notifications',
  Permissions: 'permissions',
  Data: 'data',
};

const SettingsPage: React.FC<SettingsPageProps> = ({ initialMenu }) => {
  const { t } = useTranslation();
  const [activeMenu, setActiveMenu] = useState<SettingsMenu>(() => getInitialMenu(initialMenu));
  const navListRef = useRef<HTMLUListElement>(null);
  const activeMenuButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (initialMenu) setActiveMenu(initialMenu);
  }, [initialMenu]);

  const keepActiveMenuVisible = useCallback(() => {
    const list = navListRef.current;
    const button = activeMenuButtonRef.current;
    if (!list || !button || list.scrollWidth <= list.clientWidth) return;

    const listRect = list.getBoundingClientRect();
    const buttonRect = button.getBoundingClientRect();
    if (buttonRect.left < listRect.left) {
      list.scrollLeft -= listRect.left - buttonRect.left + 8;
    } else if (buttonRect.right > listRect.right) {
      list.scrollLeft += buttonRect.right - listRect.right + 8;
    }
  }, []);

  useEffect(() => {
    const frame = window.requestAnimationFrame(keepActiveMenuVisible);
    window.addEventListener('resize', keepActiveMenuVisible);
    const resizeObserver = typeof ResizeObserver !== 'undefined' && navListRef.current
      ? new ResizeObserver(keepActiveMenuVisible)
      : null;
    if (navListRef.current) resizeObserver?.observe(navListRef.current);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('resize', keepActiveMenuVisible);
      resizeObserver?.disconnect();
    };
  }, [activeMenu, keepActiveMenuVisible]);

  const handleMenuChange = (menu: SettingsMenu) => {
    setActiveMenu(menu);
    localStorage.setItem(SETTINGS_LAST_MENU_KEY, menu);
  };

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

        <ul ref={navListRef} className="settings-page-nav-list">
          {SETTINGS_MENUS.map((menu) => (
            <li key={menu.id}>
              <button
                ref={activeMenu === menu.id ? activeMenuButtonRef : undefined}
                type="button"
                onClick={() => handleMenuChange(menu.id)}
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
        {SECTION_BY_MENU[activeMenu] && <GeneralSettings section={SECTION_BY_MENU[activeMenu]} />}
        {activeMenu === 'LLM' && <LLMSettings />}
      </main>
    </div>
  );
};

export default SettingsPage;
