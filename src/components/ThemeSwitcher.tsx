import React, { useState } from 'react';
import { useTheme, Theme } from '../contexts/ThemeContext';
import { useTranslation } from 'react-i18next';

interface ThemeSwitcherProps {
  variant?: 'default' | 'compact' | 'grid';
  showLabels?: boolean;
  showDescriptions?: boolean;
}

export const ThemeSwitcher: React.FC<ThemeSwitcherProps> = ({
  variant = 'default',
  showLabels = true,
  showDescriptions = false,
}) => {
  const { theme, setTheme, getThemeMetadata } = useTheme();
  const { t } = useTranslation();
  const [hoveredTheme, setHoveredTheme] = useState<Theme | null>(null);

  const themes: Theme[] = ['light', 'dark', 'system', 'eye-care'];

  const handleThemeClick = (selectedTheme: Theme) => {
    setTheme(selectedTheme);
  };

  if (variant === 'compact') {
    return (
      <div className="flex items-center gap-2">
        {themes.map((themeId) => {
          const metadata = getThemeMetadata(themeId);
          const themeName = t(metadata.nameKey);
          const themeDescription = t(metadata.descriptionKey);
          const isActive = theme === themeId;
          
          return (
            <button
              key={themeId}
              onClick={() => handleThemeClick(themeId)}
              onMouseEnter={() => setHoveredTheme(themeId)}
              onMouseLeave={() => setHoveredTheme(null)}
              className={`
                nb-btn ${isActive ? 'nb-btn-primary' : 'nb-btn-secondary'}
                p-2 h-10 w-10 justify-center transition-all duration-200
                ${isActive ? '' : 'hover:-translate-y-[1px]'}
              `}
              title={themeDescription}
              aria-label={themeName}
            >
              <span className="material-symbols-outlined text-xl">
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {themes.map((themeId) => {
          const metadata = getThemeMetadata(themeId);
          const themeName = t(metadata.nameKey);
          const themeDescription = t(metadata.descriptionKey);
          const isActive = theme === themeId;

          return (
            <button
              key={themeId}
              onClick={() => handleThemeClick(themeId)}
              onMouseEnter={() => setHoveredTheme(themeId)}
              onMouseLeave={() => setHoveredTheme(null)}
              className={`
                flex flex-col items-center justify-center p-4
                border-3 border-[color:var(--nb-border)] transition-all duration-200
                ${isActive
                  ? 'bg-[color:var(--nb-accent-yellow)] shadow-[6px_6px_0px_0px_var(--nb-border)] translate-x-[2px] translate-y-[2px]'
                  : 'bg-[color:var(--nb-card)] shadow-[4px_4px_0px_0px_var(--nb-border)] hover:shadow-[2px_2px_0px_0px_var(--nb-border)] hover:translate-x-[2px] hover:translate-y-[2px]'
                }
              `}
              aria-label={themeName}
              aria-pressed={isActive}
            >
              <span
                className={`
                  material-symbols-outlined text-4xl mb-2 transition-colors
                  ${isActive ? 'nb-text' : 'text-[color:var(--nb-text)]'}
                `}
              >
                {metadata.icon}
              </span>
              {showLabels && (
                <span className={`text-sm font-medium ${isActive ? 'nb-text' : 'text-[color:var(--nb-text)]'}`}>
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
    <div className="space-y-3">
      {themes.map((themeId) => {
        const metadata = getThemeMetadata(themeId);
        const themeName = t(metadata.nameKey);
        const themeDescription = t(metadata.descriptionKey);
        const isActive = theme === themeId;
        const isHovered = hoveredTheme === themeId;

        return (
          <button
            key={themeId}
            onClick={() => handleThemeClick(themeId)}
            onMouseEnter={() => setHoveredTheme(themeId)}
            onMouseLeave={() => setHoveredTheme(null)}
            className={`
              w-full flex items-center gap-4 p-4
              border-3 border-[color:var(--nb-border)] transition-all duration-200 text-left
              ${isActive
                ? 'bg-[color:var(--nb-accent-yellow)] shadow-[6px_6px_0px_0px_var(--nb-border)] translate-x-[2px] translate-y-[2px]'
                : 'nb-bg-card shadow-[4px_4px_0px_0px_var(--nb-border)] hover:shadow-[2px_2px_0px_0px_var(--nb-border)] hover:translate-x-[2px] hover:translate-y-[2px]'
              }
            `}
            aria-label={themeName}
            aria-pressed={isActive}
          >
            <div
              className={`
                flex items-center justify-center w-12 h-12
                border-3 border-[color:var(--nb-border)]
                transition-all duration-200
                ${isActive
                  ? 'bg-[color:var(--nb-card)] shadow-[3px_3px_0px_0px_var(--nb-border)] nb-text'
                  : isHovered
                    ? 'nb-bg scale-110 shadow-[2px_2px_0px_0px_var(--nb-border)] nb-text'
                    : 'nb-bg nb-text'
                }
              `}
            >
              <span className="material-symbols-outlined text-2xl">
                {metadata.icon}
              </span>
            </div>

            <div className="flex-1">
              <div className={`font-bold text-sm uppercase tracking-wide ${isActive ? 'nb-text' : 'nb-text'}`}>
                {themeName}
              </div>
              {showDescriptions && (
                <div className="text-sm nb-text-secondary mt-1">
                  {themeDescription}
                </div>
              )}
            </div>
            
            {isActive && (
              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-[color:var(--nb-accent-blue)] border-2 border-[color:var(--nb-border)] text-[color:var(--nb-border)] shadow-[2px_2px_0px_0px_var(--nb-border)]">
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
