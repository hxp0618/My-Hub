import React, { useEffect, useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

type LanguageCode = 'zh-CN' | 'en';

interface LanguageSwitcherBaseProps {
  compact?: boolean;
}

const LANGUAGE_CODES: LanguageCode[] = ['zh-CN', 'en'];

const getLanguageShortLabel = (code: LanguageCode) => (
  code === 'zh-CN' ? '中' : 'EN'
);

const LanguageSwitcherBase: React.FC<LanguageSwitcherBaseProps> = ({ compact = false }) => {
  const { i18n, t } = useTranslation();
  const menuId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [isOpen, setIsOpen] = useState(false);

  const languages = LANGUAGE_CODES.map((code) => ({
    code,
    name: t(`settings.languageOptions.${code}`),
    shortLabel: getLanguageShortLabel(code),
  }));

  const currentLanguage = languages.find(lang => lang.code === i18n.language) || languages[0];

  const handleLanguageChange = (langCode: LanguageCode) => {
    i18n.changeLanguage(langCode);
    setIsOpen(false);
  };

  const focusMenuItem = (index: number) => {
    window.requestAnimationFrame(() => {
      itemRefs.current[index]?.focus();
    });
  };

  const handleButtonKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      setIsOpen(true);
      focusMenuItem(0);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setIsOpen(true);
      focusMenuItem(languages.length - 1);
    }
  };

  const handleItemKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      focusMenuItem((index + 1) % languages.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      focusMenuItem((index - 1 + languages.length) % languages.length);
    } else if (event.key === 'Home') {
      event.preventDefault();
      focusMenuItem(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      focusMenuItem(languages.length - 1);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      setIsOpen(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [isOpen]);

  return (
    <div ref={containerRef} className="language-switcher">
      <button
        type="button"
        className={`nb-btn nb-btn-secondary language-switcher-button ${compact ? 'language-switcher-button--compact' : ''}`}
        aria-label={t('settings.languageAriaLabel')}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls={menuId}
        title={currentLanguage.name}
        onClick={() => setIsOpen(open => !open)}
        onKeyDown={handleButtonKeyDown}
      >
        <span className="material-symbols-outlined text-xl" aria-hidden="true">translate</span>
        {!compact && <span className="language-switcher-current">{currentLanguage.name}</span>}
        {compact && <span className="language-switcher-short">{currentLanguage.shortLabel}</span>}
        <span className="material-symbols-outlined text-lg" aria-hidden="true">
          {isOpen ? 'expand_less' : 'expand_more'}
        </span>
      </button>

      <div
        id={menuId}
        className={`nb-dropdown language-switcher-menu ${isOpen ? 'is-open' : ''}`}
        role="menu"
        aria-label={t('settings.language')}
      >
        {languages.map((lang) => (
          <button
            key={lang.code}
            ref={(node) => {
              itemRefs.current[languages.findIndex(item => item.code === lang.code)] = node;
            }}
            type="button"
            role="menuitemradio"
            aria-checked={i18n.language === lang.code}
            onClick={() => handleLanguageChange(lang.code)}
            onKeyDown={(event) => handleItemKeyDown(event, languages.findIndex(item => item.code === lang.code))}
            className={`nb-dropdown-item language-switcher-option ${i18n.language === lang.code ? 'nb-selected' : ''}`}
          >
            <span className="language-switcher-mark" aria-hidden="true">{lang.shortLabel}</span>
            <span className="language-switcher-option-name">{lang.name}</span>
            {i18n.language === lang.code && (
              <span className="material-symbols-outlined text-base ml-auto" aria-hidden="true">check</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

export const LanguageSwitcher: React.FC = () => <LanguageSwitcherBase />;

// 紧凑版语言切换器（仅显示当前语言短标识）
export const LanguageSwitcherCompact: React.FC = () => <LanguageSwitcherBase compact />;
