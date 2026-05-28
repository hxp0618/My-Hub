import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import enTranslation from './locales/en.json';
import zhCNTranslation from './locales/zh-CN.json';
import {
  isLanguageValue,
  language as languageStorage,
  StorageKey,
} from '../utils/storageManager';

const LEGACY_I18NEXT_LANGUAGE_KEY = 'i18nextLng';

// 获取浏览器语言或从 localStorage 读取用户选择
const getBrowserLanguage = (): string => {
  // 首先检查用户是否手动选择过语言
  const savedLanguage = localStorage.getItem(StorageKey.LANGUAGE);
  if (isLanguageValue(savedLanguage)) {
    return savedLanguage;
  }

  const legacyLanguage = localStorage.getItem(LEGACY_I18NEXT_LANGUAGE_KEY);
  if (isLanguageValue(legacyLanguage)) {
    languageStorage.set(legacyLanguage);
    return legacyLanguage;
  }

  // 否则使用浏览器语言
  const browserLang = navigator.language || navigator.languages?.[0] || 'en';

  // 映射浏览器语言到支持的语言
  if (browserLang.startsWith('zh')) {
    return 'zh-CN';
  }

  return 'en';
};

const initialLanguage = getBrowserLanguage();

// 在 i18n init 之前同步设置 HTML lang 属性，确保 :lang(zh) CSS 规则首屏就生效，
// 避免中文用户首屏出现 letter-spacing/uppercase 异常的"歪歪扭扭"问题。
if (typeof document !== 'undefined') {
  document.documentElement.lang = initialLanguage;
}

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        translation: enTranslation
      },
      'zh-CN': {
        translation: zhCNTranslation
      }
    },
    lng: initialLanguage,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false // React 已经处理了 XSS
    },
    react: {
      useSuspense: false // 避免在浏览器扩展中使用 Suspense
    }
  });

// 监听语言变化，保存到 localStorage
i18n.on('languageChanged', (lng) => {
  if (isLanguageValue(lng)) {
    languageStorage.set(lng);
  }
  // 更新 HTML lang 属性
  document.documentElement.lang = lng;
});

export default i18n;
