import React, { createContext, useContext, useState, useEffect } from 'react';

export type Theme = 'light' | 'dark' | 'system' | 'eye-care';
export type EffectiveTheme = 'light' | 'dark' | 'eye-care';

export interface ThemeMetadata {
  id: Theme;
  name: string;
  description: string;
  icon: string;
}

export const THEME_METADATA: Record<Theme, ThemeMetadata> = {
  light: {
    id: 'light',
    name: '浅色模式',
    description: '明亮清爽的界面，适合白天使用',
    icon: 'light_mode',
  },
  dark: {
    id: 'dark',
    name: '深色模式',
    description: '深色背景，降低眼睛疲劳，适合夜间使用',
    icon: 'dark_mode',
  },
  system: {
    id: 'system',
    name: '跟随系统',
    description: '自动跟随系统主题设置',
    icon: 'brightness_auto',
  },
  'eye-care': {
    id: 'eye-care',
    name: '护眼模式',
    description: '暖色调背景，减少蓝光，保护视力',
    icon: 'visibility',
  },
};

interface ThemeContextType {
  theme: Theme;
  effectiveTheme: EffectiveTheme;
  setTheme: (theme: Theme) => void;
  getThemeMetadata: (theme: Theme) => ThemeMetadata;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const VALID_THEMES: Theme[] = ['light', 'dark', 'system', 'eye-care'];

const isValidTheme = (value: string): value is Theme => {
  return VALID_THEMES.includes(value as Theme);
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
      console.error('Error reading theme from localStorage:', error);
    }
    return 'system';
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

    // 平滑过渡效果：为 body 添加临时的高亮效果
    if (!isFirstLoad) {
      root.style.transition = 'background-color 0.3s ease, color 0.3s ease';
    }
  }, [effectiveTheme, isFirstLoad]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    try {
      localStorage.setItem('theme', newTheme);
    } catch (error) {
      console.error('Error saving theme to localStorage:', error);
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
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};
