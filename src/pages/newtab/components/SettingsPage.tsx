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
  const [navScrollState, setNavScrollState] = useState({ canPrevious: false, canNext: false });

  const updateNavScrollState = useCallback(() => {
    const list = navListRef.current;
    if (!list) return;
    const maxScrollLeft = Math.max(0, list.scrollWidth - list.clientWidth);
    setNavScrollState({
      canPrevious: list.scrollLeft > 2,
      canNext: list.scrollLeft < maxScrollLeft - 2,
    });
  }, []);

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
    updateNavScrollState();
  }, [updateNavScrollState]);

  useEffect(() => {
    const navList = navListRef.current;
    const frame = window.requestAnimationFrame(keepActiveMenuVisible);
    window.addEventListener('resize', keepActiveMenuVisible);
    navList?.addEventListener('scroll', updateNavScrollState, { passive: true });
    const resizeObserver = typeof ResizeObserver !== 'undefined' && navList
      ? new ResizeObserver(keepActiveMenuVisible)
      : null;
    if (navList) resizeObserver?.observe(navList);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('resize', keepActiveMenuVisible);
      navList?.removeEventListener('scroll', updateNavScrollState);
      resizeObserver?.disconnect();
    };
  }, [activeMenu, keepActiveMenuVisible, updateNavScrollState]);

  const scrollSettingsNav = (direction: -1 | 1) => {
    const list = navListRef.current;
    if (!list) return;
    list.scrollBy({
      left: direction * Math.max(144, Math.round(list.clientWidth * 0.75)),
      behavior: 'smooth',
    });
  };

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

        <div className="settings-page-nav-scroll">
          <button
            type="button"
            className="settings-page-nav-scroll-button nb-btn nb-btn-ghost"
            onClick={() => scrollSettingsNav(-1)}
            disabled={!navScrollState.canPrevious}
            aria-label={t('settings.previousSection')}
          >
            <span className="material-symbols-outlined" aria-hidden="true">chevron_left</span>
          </button>
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
          <button
            type="button"
            className="settings-page-nav-scroll-button nb-btn nb-btn-ghost"
            onClick={() => scrollSettingsNav(1)}
            disabled={!navScrollState.canNext}
            aria-label={t('settings.nextSection')}
          >
            <span className="material-symbols-outlined" aria-hidden="true">chevron_right</span>
          </button>
        </div>
      </nav>

      <main className="settings-page-content" aria-live="polite">
        {SECTION_BY_MENU[activeMenu] && <GeneralSettings section={SECTION_BY_MENU[activeMenu]} />}
        {activeMenu === 'LLM' && <LLMSettings />}
      </main>
    </div>
  );
};

export default SettingsPage;
