import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import enTranslation from './locales/en.json';
import zhCNTranslation from './locales/zh-CN.json';

// 获取浏览器语言或从 localStorage 读取用户选择
const getBrowserLanguage = (): string => {
  // 首先检查用户是否手动选择过语言
  const savedLanguage = localStorage.getItem('language');
  if (savedLanguage) {
    return savedLanguage;
  }

  // 否则使用浏览器语言
  const browserLang = navigator.language || navigator.languages?.[0] || 'en';

  // 映射浏览器语言到支持的语言
  if (browserLang.startsWith('zh')) {
    return 'zh-CN';
  }

  return 'en';
};

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
    lng: getBrowserLanguage(),
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
  localStorage.setItem('language', lng);
  // 更新 HTML lang 属性
  document.documentElement.lang = lng;
});

export default i18n;
