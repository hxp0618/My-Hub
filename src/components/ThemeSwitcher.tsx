import React, { useState } from 'react';
import { useTheme, Theme, THEME_METADATA } from '../contexts/ThemeContext';
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
              title={metadata.description}
              aria-label={metadata.name}
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
          const isActive = theme === themeId;
          
          return (
            <button
              key={themeId}
              onClick={() => handleThemeClick(themeId)}
              onMouseEnter={() => setHoveredTheme(themeId)}
              onMouseLeave={() => setHoveredTheme(null)}
              className={`
                flex flex-col items-center justify-center p-4 rounded-xl
                border-[length:var(--nb-border-width)] transition-all duration-200
                ${isActive
                  ? 'border-[color:var(--nb-accent-yellow)] bg-[color:var(--nb-accent-yellow)]/20 shadow-[var(--nb-shadow)]'
                  : 'border-[color:var(--nb-border)] bg-[color:var(--nb-card)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[var(--nb-shadow-hover)]'
                }
              `}
              aria-label={metadata.name}
              aria-pressed={isActive}
            >
              <span
                className={`
                  material-symbols-outlined text-4xl mb-2 transition-colors
                  ${isActive ? 'text-[color:var(--nb-accent-yellow)]' : 'text-[color:var(--nb-text)]'}
                `}
              >
                {metadata.icon}
              </span>
              {showLabels && (
                <span className={`text-sm font-medium ${isActive ? 'text-[color:var(--nb-accent-yellow)]' : 'text-[color:var(--nb-text)]'}`}>
                  {metadata.name}
                </span>
              )}
              {showDescriptions && (
                <span className="text-xs nb-text-secondary mt-1 text-center">
                  {metadata.description}
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
        const isActive = theme === themeId;
        const isHovered = hoveredTheme === themeId;
        
        return (
          <button
            key={themeId}
            onClick={() => handleThemeClick(themeId)}
            onMouseEnter={() => setHoveredTheme(themeId)}
            onMouseLeave={() => setHoveredTheme(null)}
            className={`
              w-full flex items-center gap-4 p-4 rounded-xl
              border-[length:var(--nb-border-width)] transition-all duration-200 text-left
              ${isActive
                ? 'border-[color:var(--nb-accent-yellow)] bg-[color:var(--nb-accent-yellow)]/20 shadow-[var(--nb-shadow)]'
                : 'border-[color:var(--nb-border)] nb-bg-card hover:shadow-[var(--nb-shadow-hover)]'
              }
            `}
            aria-label={metadata.name}
            aria-pressed={isActive}
          >
            <div
              className={`
                flex items-center justify-center w-12 h-12 rounded-lg
                transition-all duration-200
                ${isActive
                  ? 'bg-[color:var(--nb-accent-yellow)] nb-text'
                  : isHovered
                    ? 'nb-bg scale-110 nb-text'
                    : 'nb-bg nb-text'
                }
              `}
            >
              <span className="material-symbols-outlined text-2xl">
                {metadata.icon}
              </span>
            </div>

            <div className="flex-1">
              <div className={`font-semibold ${isActive ? 'text-[color:var(--nb-accent-yellow)]' : 'nb-text'}`}>
                {metadata.name}
              </div>
              {showDescriptions && (
                <div className="text-sm nb-text-secondary mt-1">
                  {metadata.description}
                </div>
              )}
            </div>
            
            {isActive && (
              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-accent text-white">
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
