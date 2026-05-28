import React, { createContext, useContext, useState, useEffect } from 'react';
import { createLogger } from '../utils/logger';

const logger = createLogger('[ThemeContext]');

export type Theme = 'light' | 'dark' | 'system' | 'eye-care';
export type EffectiveTheme = 'light' | 'dark' | 'eye-care';

export interface ThemeMetadata {
  id: Theme;
  nameKey: string;
  descriptionKey: string;
  icon: string;
}

export const THEME_METADATA: Record<Theme, ThemeMetadata> = {
  light: {
    id: 'light',
    nameKey: 'settings.themeLight',
    descriptionKey: 'settings.themeLightDesc',
    icon: 'light_mode',
  },
  dark: {
    id: 'dark',
    nameKey: 'settings.themeDark',
    descriptionKey: 'settings.themeDarkDesc',
    icon: 'dark_mode',
  },
  system: {
    id: 'system',
    nameKey: 'settings.themeSystem',
    descriptionKey: 'settings.themeSystemDesc',
    icon: 'brightness_auto',
  },
  'eye-care': {
    id: 'eye-care',
    nameKey: 'settings.themeEyeCare',
    descriptionKey: 'settings.themeEyeCareDesc',
    icon: 'visibility',
  },
};

interface ThemeContextType {
  theme: Theme;
  effectiveTheme: EffectiveTheme;
  setTheme: (theme: Theme) => void;
  getThemeMetadata: (theme: Theme) => ThemeMetadata;
  brightness: number;
  setBrightness: (brightness: number) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const VALID_THEMES: Theme[] = ['light', 'dark', 'system', 'eye-care'];
export const DEFAULT_BRIGHTNESS = 1.0;
export const MIN_BRIGHTNESS = 0.5;
export const MAX_BRIGHTNESS = 1.0;

const isValidTheme = (value: string): value is Theme => {
  return VALID_THEMES.includes(value as Theme);
};

const isValidBrightness = (value: unknown): value is number => {
  return typeof value === 'number' && Number.isFinite(value) && value >= MIN_BRIGHTNESS && value <= MAX_BRIGHTNESS;
};

export const parseStoredBrightness = (stored: string | null): number => {
  if (stored === null) return DEFAULT_BRIGHTNESS;

  const value = Number(stored);
  return isValidBrightness(value) ? value : DEFAULT_BRIGHTNESS;
};

export const sanitizeBrightnessInput = (value: unknown): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return DEFAULT_BRIGHTNESS;
  return Math.max(MIN_BRIGHTNESS, Math.min(MAX_BRIGHTNESS, value));
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    try {
      const stored = localStorage.getItem('theme');
      if (stored && isValidTheme(stored)) {
        return stored;
      }
    } catch (error) {
      logger.error('Error reading theme from localStorage', error);
    }
    return 'system';
  });

  const [brightness, setBrightnessState] = useState<number>(() => {
    try {
      return parseStoredBrightness(localStorage.getItem('brightness'));
    } catch (error) {
      logger.error('Error reading brightness from localStorage', error);
    }
    return DEFAULT_BRIGHTNESS;
  });

  const [systemTheme, setSystemTheme] = useState<'light' | 'dark'>(() => {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  const [isFirstLoad, setIsFirstLoad] = useState(true);

  // 防止首次加载时的过渡动画
  useEffect(() => {
    const root = document.documentElement;
    // 添加 preload 类防止过渡动画
    root.classList.add('preload');

    // 在下一帧移除 preload 类，允许后续的过渡动画
    const timer = setTimeout(() => {
      root.classList.remove('preload');
      setIsFirstLoad(false);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  // 监听系统主题变化
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? 'dark' : 'light');
    };

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  // 计算实际应用的主题
  const effectiveTheme: EffectiveTheme = theme === 'system' ? systemTheme : theme;

  // 应用主题到 document
  useEffect(() => {
    const root = document.documentElement;

    // 切换主题瞬间禁用全局 transition，避免几十个组件同时跑过渡造成"扑闪"
    if (!isFirstLoad) {
      root.classList.add('theme-switching');
    }

    // 移除所有主题类
    root.classList.remove('dark', 'eye-care', 'light');

    // 添加当前主题类
    if (effectiveTheme === 'dark') {
      root.classList.add('dark');
    } else if (effectiveTheme === 'eye-care') {
      root.classList.add('eye-care');
    } else {
      root.classList.add('light');
    }

    // 设置 data 属性用于 CSS 选择器
    root.setAttribute('data-theme', effectiveTheme);

    // 下一帧解除抑制，让后续交互的过渡恢复
    if (!isFirstLoad) {
      const timer = window.setTimeout(() => {
        root.classList.remove('theme-switching');
      }, 0);
      return () => window.clearTimeout(timer);
    }
  }, [effectiveTheme, isFirstLoad]);

  // 应用亮度到 document
  useEffect(() => {
    const root = document.documentElement;
    if (brightness < MAX_BRIGHTNESS) {
      root.style.filter = `brightness(${brightness})`;
    } else {
      root.style.filter = '';
    }
  }, [brightness]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    try {
      localStorage.setItem('theme', newTheme);
    } catch (error) {
      logger.error('Error saving theme to localStorage', error);
    }
  };

  const setBrightness = (newBrightness: number) => {
    const clampedValue = sanitizeBrightnessInput(newBrightness);
    setBrightnessState(clampedValue);
    try {
      localStorage.setItem('brightness', clampedValue.toString());
    } catch (error) {
      logger.error('Error saving brightness to localStorage', error);
    }
  };

  const getThemeMetadata = (themeId: Theme): ThemeMetadata => {
    return THEME_METADATA[themeId];
  };

  const value: ThemeContextType = {
    theme,
    effectiveTheme,
    setTheme,
    getThemeMetadata,
    brightness,
    setBrightness,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};
