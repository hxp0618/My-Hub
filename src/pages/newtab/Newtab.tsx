import React, { useState, useRef, useEffect } from 'react';
import '@pages/newtab/Newtab.css';
import { useMomentInHistory } from './hooks/useMomentInHistory';
import { HomePage } from './components/HomePage';
import { HistoryPage } from './components/HistoryPage';
import { BookmarkPage } from './components/BookmarkPage';
import { TagsPage } from './components/TagsPage';
import { ToolsPage } from './components/ToolsPage';
import { SubscriptionsPage } from './components/SubscriptionsPage';
import { Modal } from '../../components/Modal';
import SettingsPage from './components/SettingsPage';
import { ToastProvider } from '../../contexts/ToastContext';
import { ThemeProvider } from '../../contexts/ThemeContext';
import { useTranslation } from 'react-i18next';
import { ErrorBoundary } from '../../components/ErrorBoundary';
import { useMenuOrder } from '../../hooks/useMenuOrder';
import { useMenuCustomization } from '../../hooks/useMenuCustomization';
import { MENU_ITEMS } from '../../types/menu';
import { ToolId } from '../../types/tools';
import { SearchActionTarget } from '../../types/searchActions';
import {
  MAX_SIDEBAR_WIDTH,
  MIN_SIDEBAR_WIDTH,
  sidebarWidth as sidebarWidthStorage,
} from '../../utils/storageManager';

// =================================================================================
// Main Component
// =================================================================================

// 定义页面类型的联合类型
type Page = 'home' | 'history' | 'bookmarks' | 'tags' | 'tools' | 'subscriptions';

/**
 * Newtab 组件是新标签页面的主组件。
 * 它负责管理不同的页面视图（主页、历史记录、书签），并协调数据的获取与展示。
 */
export default function Newtab() {
  const { t } = useTranslation();
  // 页面状态管理，用于在 'home', 'history', 'bookmarks' 之间切换
  const [page, setPage] = useState<Page>('home');
  const [requestedToolId, setRequestedToolId] = useState<ToolId | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isCompactLayout, setIsCompactLayout] = useState(false);
  // 自定义 hook，用于获取"历史上的今天"的推荐内容
  const { recommendations, timeRange, refreshRecommendations } = useMomentInHistory();
  // 自定义 hook，用于获取菜单顺序和自定义配置
  const { menuOrder } = useMenuOrder();
  const { getItemIcon } = useMenuCustomization();

  // 侧边栏宽度管理
  const [sidebarWidth, setSidebarWidth] = useState<number>(() => {
    return sidebarWidthStorage.get();
  });

  const [isResizing, setIsResizing] = useState(false);
  const shellRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);

  const handleOpenTool = (toolId: ToolId) => {
    setRequestedToolId(toolId);
    setPage('tools');
    setIsMobileSidebarOpen(false);
  };

  const handleOpenAction = (target: SearchActionTarget) => {
    if (target.kind === 'settings') {
      setIsSettingsOpen(true);
      setIsMobileSidebarOpen(false);
      return;
    }

    setPage(target.page);
    setIsMobileSidebarOpen(false);
  };

  const handleNavigate = (targetPage: Page) => {
    setPage(targetPage);
    setIsMobileSidebarOpen(false);
  };

  const handleOpenSettings = () => {
    setIsSettingsOpen(true);
    setIsMobileSidebarOpen(false);
  };

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
        sidebarWidthStorage.set(newWidth);
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

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMobileSidebarOpen(false);
      }
    };

    if (isMobileSidebarOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.classList.add('newtab-mobile-nav-open');
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.classList.remove('newtab-mobile-nav-open');
    };
  }, [isMobileSidebarOpen]);

  useEffect(() => {
    const updateCompactLayout = () => {
      const shellWidth = shellRef.current?.clientWidth || window.innerWidth;
      const nextIsCompactLayout = shellWidth <= 900;

      setIsCompactLayout(nextIsCompactLayout);
      if (!nextIsCompactLayout) {
        setIsMobileSidebarOpen(false);
      }
    };

    updateCompactLayout();

    const resizeObserver = typeof ResizeObserver !== 'undefined' && shellRef.current
      ? new ResizeObserver(updateCompactLayout)
      : null;

    if (shellRef.current) {
      resizeObserver?.observe(shellRef.current);
    }

    window.addEventListener('resize', updateCompactLayout);

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener('resize', updateCompactLayout);
    };
  }, []);

  const renderPageContent = () => {
    switch (page) {
      case 'home':
        return (
          <ErrorBoundary>
            <HomePage
              recommendations={recommendations}
              timeRange={timeRange}
              onRefresh={refreshRecommendations}
              onOpenTool={handleOpenTool}
              onOpenAction={handleOpenAction}
            />
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
            <ToolsPage initialToolId={requestedToolId} />
          </ErrorBoundary>
        );
      case 'subscriptions':
        return (
          <ErrorBoundary>
            <SubscriptionsPage />
          </ErrorBoundary>
        );
      default:
        return null;
    }
  };

  return (
    <ThemeProvider>
      <ToastProvider>
        <div
          ref={shellRef}
          className={`newtab-shell flex h-screen nb-bg nb-bg-grid nb-text ${
            isCompactLayout ? 'mobile-layout' : ''
          }`}
        >
          <header className="newtab-mobile-bar nb-card-static nb-bg-halftone">
            <button
              type="button"
              className="newtab-mobile-icon-button"
              aria-label={t(isMobileSidebarOpen ? 'sidebar.closeNavigation' : 'sidebar.openNavigation')}
              aria-expanded={isMobileSidebarOpen}
              aria-controls="newtab-sidebar"
              onClick={() => setIsMobileSidebarOpen((open) => !open)}
            >
              <span className="material-symbols-outlined" aria-hidden="true">
                {isMobileSidebarOpen ? 'close' : 'menu'}
              </span>
            </button>
            <div className="newtab-mobile-title">
              <span className="material-symbols-outlined text-xl" aria-hidden="true">
                {getItemIcon(page, MENU_ITEMS[page].icon)}
              </span>
              <span>{t(MENU_ITEMS[page].labelKey)}</span>
            </div>
            <button
              type="button"
              className="newtab-mobile-icon-button"
              aria-label={t('sidebar.settings')}
              onClick={handleOpenSettings}
            >
              <span className="material-symbols-outlined" aria-hidden="true">settings</span>
            </button>
          </header>

          <button
            type="button"
            className={`newtab-sidebar-backdrop ${isMobileSidebarOpen ? 'is-visible' : ''}`}
            aria-label={t('sidebar.closeNavigation')}
            onClick={() => setIsMobileSidebarOpen(false)}
          />

          {/* 侧边栏 */}
          <aside
            id="newtab-sidebar"
            ref={sidebarRef}
            aria-label={t('sidebar.navigation')}
            style={{ width: `${sidebarWidth}px` }}
            className={`newtab-sidebar nb-card-static nb-bg-halftone p-8 flex flex-col relative flex-shrink-0 transition-none m-4 mr-0 rounded-none overflow-hidden ${
              isMobileSidebarOpen ? 'mobile-open' : ''
            }`}
          >
            {/* 装饰元素 - 增强版 */}
            {/* 浮动粉色圆形 */}
            <div className="absolute -top-6 -right-6 w-16 h-16 rounded-full bg-[color:var(--nb-accent-pink)] border-3 border-[color:var(--nb-border)] opacity-20 nb-float"></div>

            {/* 蓝色有机形状 */}
            <div className="absolute -bottom-8 -left-8 w-20 h-20 bg-[color:var(--nb-accent-blue)] border-3 border-[color:var(--nb-border)] opacity-15 nb-sticker-2" style={{ borderRadius: '30% 70% 70% 30% / 30% 30% 70% 70%' }}></div>

            {/* 黄色星星装饰 */}
            <div className="absolute top-1/3 -right-4 w-12 h-12 bg-[color:var(--nb-accent-yellow)] border-2 border-[color:var(--nb-border)] opacity-25 nb-rotate-slow" style={{ clipPath: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)' }}></div>

            {/* 绿色方块装饰 */}
            <div className="absolute bottom-1/4 -left-6 w-14 h-14 bg-[color:var(--nb-accent-green)] border-3 border-[color:var(--nb-border)] opacity-20 nb-sticker-3 shadow-[3px_3px_0px_0px_var(--nb-border)]"></div>

            {/* Logo / App Name - 增强版 */}
            <div className="mb-12 relative z-10">
              {/* Logo 背景框 */}
              <div className="inline-block p-4 -ml-2 border-3 border-[color:var(--nb-border)] bg-[color:var(--nb-accent-yellow)] shadow-[4px_4px_0px_0px_var(--nb-border)] nb-sticker-1">
                <h1 className="text-3xl font-black nb-text uppercase tracking-tighter leading-none">
                  {t('sidebar.appName')}
                </h1>
              </div>
            </div>

            {/* 导航菜单 */}
            <nav className="flex-1">
              <ul className="space-y-3">
                {menuOrder.map((itemId) => {
                  const item = MENU_ITEMS[itemId];
                  const displayIcon = getItemIcon(itemId, item.icon);
                  return (
                    <li key={itemId}>
                      <a
                        className={`nb-nav-item ${page === itemId ? 'active' : ''}`}
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          handleNavigate(itemId as Page);
                        }}
                      >
                        <span className="material-symbols-outlined text-xl">{displayIcon}</span>
                        <span className="font-bold text-sm uppercase tracking-wide">{t(item.labelKey)}</span>
                      </a>
                    </li>
                  );
                })}
              </ul>
            </nav>

            {/* Settings Entry */}
            <div className="mt-6">
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  handleOpenSettings();
                }}
                className="nb-nav-item"
              >
                <span className="material-symbols-outlined text-xl">settings</span>
                <span className="font-bold text-sm uppercase tracking-wide">{t('sidebar.settings')}</span>
              </a>
            </div>

            {/* 拖拽把手 */}
            <div
              onMouseDown={handleMouseDown}
              className={`absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-[color:var(--nb-accent-yellow)] transition-colors group ${
                isResizing ? 'bg-[color:var(--nb-accent-pink)]' : ''
              }`}
            >
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-12 bg-[color:var(--nb-border)] rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </aside>

          {/* 主内容区域 */}
          <main className="newtab-main flex-1 overflow-hidden nb-bg p-4">
            <div className="h-full flex flex-col gap-4">
              <div className="newtab-content-card flex-1 nb-card-static p-8 rounded-none nb-bg-halftone overflow-auto">
                {renderPageContent()}
              </div>
            </div>
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
