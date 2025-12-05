import React, { useState, useRef, useEffect } from 'react';
import '@pages/newtab/Newtab.css';
import { useMomentInHistory } from './hooks/useMomentInHistory';
import { useEnhancedHistory } from './hooks/useEnhancedHistory';
import { HomePage } from './components/HomePage';
import { HistoryPage } from './components/HistoryPage';
import { BookmarkPage } from './components/BookmarkPage';
import { TagsPage } from './components/TagsPage';
import { ToolsPage } from './components/ToolsPage';
import { Modal } from '../../components/Modal';
import SettingsPage from './components/SettingsPage';
import { ToastProvider } from '../../contexts/ToastContext';
import { ThemeProvider } from '../../contexts/ThemeContext';
import { useTranslation } from 'react-i18next';
import { ErrorBoundary } from '../../components/ErrorBoundary';
import { useMenuOrder } from '../../hooks/useMenuOrder';
import { useMenuCustomization } from '../../hooks/useMenuCustomization';
import { MENU_ITEMS } from '../../types/menu';

// =================================================================================
// Main Component
// =================================================================================

// 定义页面类型的联合类型
type Page = 'home' | 'history' | 'bookmarks' | 'tags' | 'tools';

/**
 * Newtab 组件是新标签页面的主组件。
 * 它负责管理不同的页面视图（主页、历史记录、书签），并协调数据的获取与展示。
 */
export default function Newtab() {
  const { t } = useTranslation();
  // 页面状态管理，用于在 'home', 'history', 'bookmarks' 之间切换
  const [page, setPage] = useState<Page>('home');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  // 自定义 hook，用于获取"历史上的今天"的推荐内容
  const { recommendations, timeRange } = useMomentInHistory();
  // 自定义 hook，用于获取、筛选和分页加载增强的历史记录
  const { historyItems, devices, isLoading, filters, setFilters, hasMore, loadMore } = useEnhancedHistory();
  // 自定义 hook，用于获取菜单顺序和自定义配置
  const { menuOrder } = useMenuOrder();
  const { getItemIcon } = useMenuCustomization();

  // 侧边栏宽度管理
  const MIN_SIDEBAR_WIDTH = 200;
  const MAX_SIDEBAR_WIDTH = 400;
  const DEFAULT_SIDEBAR_WIDTH = 256; // w-64 = 256px

  const [sidebarWidth, setSidebarWidth] = useState<number>(() => {
    const saved = localStorage.getItem('sidebarWidth');
    return saved ? parseInt(saved, 10) : DEFAULT_SIDEBAR_WIDTH;
  });

  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);

  // 处理拖拽开始
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };

  // 处理拖拽中
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      const newWidth = e.clientX;
      if (newWidth >= MIN_SIDEBAR_WIDTH && newWidth <= MAX_SIDEBAR_WIDTH) {
        setSidebarWidth(newWidth);
        localStorage.setItem('sidebarWidth', newWidth.toString());
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing]);

  const renderPageContent = () => {
    switch (page) {
      case 'home':
        return (
          <ErrorBoundary>
            <HomePage recommendations={recommendations} timeRange={timeRange} />
          </ErrorBoundary>
        );
      case 'history':
        return (
          <ErrorBoundary>
            <HistoryPage />
          </ErrorBoundary>
        );
      case 'bookmarks':
        return (
          <ErrorBoundary>
            <BookmarkPage />
          </ErrorBoundary>
        );
      case 'tags':
        return (
          <ErrorBoundary>
            <TagsPage />
          </ErrorBoundary>
        );
      case 'tools':
        return (
          <ErrorBoundary>
            <ToolsPage />
          </ErrorBoundary>
        );
      default:
        return null;
    }
  };

  return (
    <ThemeProvider>
      <ToastProvider>
        <div className="flex h-screen nb-bg nb-text">
          {/* 侧边栏 */}
          <aside
            ref={sidebarRef}
            style={{ width: `${sidebarWidth}px` }}
            className="nb-bg nb-border nb-shadow rounded-xl p-6 flex flex-col relative flex-shrink-0 transition-none"
          >
            <h1 className="text-3xl font-bold mb-12 nb-text">{t('sidebar.appName')}</h1>
            {/* 导航菜单 */}
            <nav>
              <ul>
                {menuOrder.map((itemId, index) => {
                  const item = MENU_ITEMS[itemId];
                  const displayIcon = getItemIcon(itemId, item.icon);
                  return (
                    <li key={itemId} className={index > 0 ? 'mt-4' : ''}>
                      <a
                        className={`nb-nav-item ${page === itemId ? 'active' : ''}`}
                        href="#"
                        onClick={() => setPage(itemId as Page)}
                      >
                        <span className="material-symbols-outlined icon-linear mr-4">{displayIcon}</span>
                        {t(item.labelKey)}
                      </a>
                    </li>
                  );
                })}
              </ul>
            </nav>

            {/* Settings Entry */}
            <div className="mt-auto">
              <a
                href="#"
                onClick={() => setIsSettingsOpen(true)}
                className="nb-nav-item"
              >
                <span className="material-symbols-outlined icon-linear mr-4">settings</span>
                {t('sidebar.settings')}
              </a>
            </div>

            {/* 拖拽把手 */}
            <div
              onMouseDown={handleMouseDown}
              className={`absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-gray-400 dark:hover:bg-gray-600 transition-colors group ${
                isResizing ? 'bg-accent' : ''
              }`}
            >
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-12 bg-gray-300 dark:bg-gray-700 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </aside>
          {/* 主内容区域 */}
          <main className="flex-1 overflow-y-auto nb-bg">
            {renderPageContent()}
          </main>

          <Modal
            isOpen={isSettingsOpen}
            onClose={() => setIsSettingsOpen(false)}
            title={t('sidebar.settings')}
            widthClass="max-w-4xl"
          >
            <SettingsPage onClose={() => setIsSettingsOpen(false)} />
          </Modal>
        </div>
      </ToastProvider>
    </ThemeProvider>
  );
}
