import React from 'react';
import { useTheme, Theme } from '../contexts/ThemeContext';
import { useTranslation } from 'react-i18next';

interface ThemeSwitcherProps {
  variant?: 'default' | 'compact' | 'grid';
  showLabels?: boolean;
  showDescriptions?: boolean;
}

const THEMES: Theme[] = ['light', 'dark', 'system', 'eye-care'];

export const ThemeSwitcher: React.FC<ThemeSwitcherProps> = ({
  variant = 'default',
  showLabels = true,
  showDescriptions = false,
}) => {
  const { theme, setTheme, getThemeMetadata } = useTheme();
  const { t } = useTranslation();

  const handleThemeClick = (selectedTheme: Theme) => {
    setTheme(selectedTheme);
  };

  const focusThemeOption = (themeId: Theme) => {
    window.requestAnimationFrame(() => {
      document.querySelector<HTMLElement>(`[data-theme-option="${themeId}"]`)?.focus();
    });
  };

  const moveThemeSelection = (currentTheme: Theme, nextIndex: number) => {
    const nextTheme = THEMES[(nextIndex + THEMES.length) % THEMES.length];
    setTheme(nextTheme);
    focusThemeOption(nextTheme);
  };

  const handleThemeKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, currentTheme: Theme) => {
    const currentIndex = THEMES.indexOf(currentTheme);

    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      event.preventDefault();
      moveThemeSelection(currentTheme, currentIndex + 1);
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault();
      moveThemeSelection(currentTheme, currentIndex - 1);
    } else if (event.key === 'Home') {
      event.preventDefault();
      moveThemeSelection(currentTheme, 0);
    } else if (event.key === 'End') {
      event.preventDefault();
      moveThemeSelection(currentTheme, THEMES.length - 1);
    }
  };

  const getRadioProps = (themeId: Theme, isActive: boolean) => ({
    role: 'radio',
    'aria-checked': isActive,
    tabIndex: isActive ? 0 : -1,
    'data-theme-option': themeId,
    onKeyDown: (event: React.KeyboardEvent<HTMLButtonElement>) => handleThemeKeyDown(event, themeId),
  });

  if (variant === 'compact') {
    return (
      <div className="theme-switcher-compact" role="radiogroup" aria-label={t('settings.selectTheme')}>
        {THEMES.map((themeId) => {
          const metadata = getThemeMetadata(themeId);
          const themeName = t(metadata.nameKey);
          const themeDescription = t(metadata.descriptionKey);
          const isActive = theme === themeId;
          
          return (
            <button
              key={themeId}
              type="button"
              onClick={() => handleThemeClick(themeId)}
              className={`
                nb-btn ${isActive ? 'nb-btn-primary' : 'nb-btn-secondary'}
                theme-switcher-compact-option
                ${isActive ? '' : 'hover:-translate-y-[1px]'}
              `}
              title={themeDescription}
              aria-label={themeName}
              {...getRadioProps(themeId, isActive)}
            >
              <span className="material-symbols-outlined text-xl" aria-hidden="true">
                {metadata.icon}
              </span>
            </button>
          );
        })}
      </div>
    );
  }

  if (variant === 'grid') {
    return (
      <div className="theme-switcher-grid" role="radiogroup" aria-label={t('settings.selectTheme')}>
        {THEMES.map((themeId) => {
          const metadata = getThemeMetadata(themeId);
          const themeName = t(metadata.nameKey);
          const themeDescription = t(metadata.descriptionKey);
          const isActive = theme === themeId;

          return (
            <button
              key={themeId}
              type="button"
              onClick={() => handleThemeClick(themeId)}
              className={`
                theme-switcher-grid-option
                ${isActive
                  ? 'theme-switcher-option--active'
                  : 'theme-switcher-option--idle'
                }
              `}
              aria-label={themeName}
              {...getRadioProps(themeId, isActive)}
            >
              <span
                className={`
                  material-symbols-outlined theme-switcher-grid-icon
                  ${isActive ? 'theme-switcher-accent-text' : 'text-[color:var(--nb-text)]'}
                `}
                aria-hidden="true"
              >
                {metadata.icon}
              </span>
              {showLabels && (
                <span className={`theme-switcher-label ${isActive ? 'theme-switcher-accent-text' : 'text-[color:var(--nb-text)]'}`}>
                  {themeName}
                </span>
              )}
              {showDescriptions && (
                <span className="text-xs nb-text-secondary mt-1 text-center">
                  {themeDescription}
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  // Default variant - list with full info
  return (
    <div className="theme-switcher-list" role="radiogroup" aria-label={t('settings.selectTheme')}>
      {THEMES.map((themeId) => {
        const metadata = getThemeMetadata(themeId);
        const themeName = t(metadata.nameKey);
        const themeDescription = t(metadata.descriptionKey);
        const isActive = theme === themeId;

        return (
          <button
            key={themeId}
            type="button"
            onClick={() => handleThemeClick(themeId)}
            className={`
              theme-switcher-list-option
              ${isActive
                ? 'theme-switcher-option--active'
                : 'theme-switcher-option--idle'
              }
            `}
            aria-label={themeName}
            {...getRadioProps(themeId, isActive)}
          >
            <div
              className={`
                theme-switcher-list-icon
                ${isActive
                  ? 'bg-[color:var(--nb-card)] shadow-[3px_3px_0px_0px_var(--nb-shadow-color)] nb-text'
                  : 'nb-bg nb-text'
                }
              `}
            >
              <span className="material-symbols-outlined text-2xl" aria-hidden="true">
                {metadata.icon}
              </span>
            </div>

            <div className="theme-switcher-list-copy">
              <div className={`theme-switcher-label ${isActive ? 'theme-switcher-accent-text' : 'nb-text'}`}>
                {themeName}
              </div>
              {showDescriptions && (
                <div className="text-sm nb-text-secondary mt-1">
                  {themeDescription}
                </div>
              )}
            </div>
            
            {isActive && (
              <div className="theme-switcher-check" aria-hidden="true">
                <span className="material-symbols-outlined text-sm">check</span>
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
};

// Quick theme toggle button (for header/navbar)
export const QuickThemeToggle: React.FC = () => {
  const { theme, effectiveTheme, setTheme } = useTheme();
  const { t } = useTranslation();

  const cycleTheme = () => {
    const themeOrder: Theme[] = ['light', 'dark', 'system'];
    const currentIndex = themeOrder.indexOf(theme);
    const nextIndex = (currentIndex + 1) % themeOrder.length;
    setTheme(themeOrder[nextIndex]);
  };

  const getIcon = () => {
    if (theme === 'system') return 'brightness_auto';
    return effectiveTheme === 'dark' ? 'dark_mode' : 'light_mode';
  };

  return (
    <button
      onClick={cycleTheme}
      className="nb-btn nb-btn-ghost p-2"
      aria-label={t('settings.theme')}
      title={t('settings.theme')}
    >
      <span className="material-symbols-outlined">
        {getIcon()}
      </span>
    </button>
  );
};
