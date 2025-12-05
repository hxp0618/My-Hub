import React from 'react';
import { useTranslation } from 'react-i18next';

export const LanguageSwitcher: React.FC = () => {
  const { i18n, t } = useTranslation();

  const languages = [
    { code: 'zh-CN', name: t('settings.languageOptions.zh-CN'), flag: '🇨🇳' },
    { code: 'en', name: t('settings.languageOptions.en'), flag: '🇺🇸' }
  ];

  const currentLanguage = languages.find(lang => lang.code === i18n.language) || languages[1];

  const handleLanguageChange = (langCode: string) => {
    i18n.changeLanguage(langCode);
  };

  return (
    <div className="relative group">
      <button
        className="nb-btn nb-btn-secondary gap-2 px-3 py-2"
        aria-label={t('settings.languageAriaLabel')}
      >
        <span className="text-lg">{currentLanguage.flag}</span>
        <span className="text-sm text-main">{currentLanguage.name}</span>
        <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* 下拉菜单 */}
      <div className="nb-dropdown absolute right-0 mt-2 w-48 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
        {languages.map((lang) => (
          <button
            key={lang.code}
            onClick={() => handleLanguageChange(lang.code)}
            className={`
              nb-dropdown-item w-full flex items-center gap-3 text-left transition-colors
              ${i18n.language === lang.code ? 'nb-selected' : ''}
            `}
          >
            <span className="text-lg">{lang.flag}</span>
            <span className="text-sm font-medium">{lang.name}</span>
            {i18n.language === lang.code && (
              <svg className="w-4 h-4 ml-auto" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

// 紧凑版语言切换器（仅显示图标）
export const LanguageSwitcherCompact: React.FC = () => {
  const { i18n, t } = useTranslation();

  const languages = [
    { code: 'zh-CN', name: t('settings.languageOptions.zh-CN'), flag: '🇨🇳' },
    { code: 'en', name: t('settings.languageOptions.en'), flag: '🇺🇸' }
  ];

  const currentLanguage = languages.find(lang => lang.code === i18n.language) || languages[1];

  return (
    <div className="relative group">
      <button
        className="nb-btn nb-btn-secondary p-2"
        aria-label={t('settings.language')}
        title={currentLanguage.name}
      >
        <span className="text-xl">{currentLanguage.flag}</span>
      </button>

      {/* 下拉菜单 */}
      <div className="nb-dropdown absolute right-0 mt-2 w-40 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
        {languages.map((lang) => (
          <button
            key={lang.code}
            onClick={() => i18n.changeLanguage(lang.code)}
            className={`
              nb-dropdown-item w-full flex items-center gap-2 text-left transition-colors
              ${i18n.language === lang.code ? 'nb-selected' : ''}
            `}
          >
            <span className="text-lg">{lang.flag}</span>
            <span className="text-sm">{lang.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
