import React, { lazy, Suspense, useState, useRef, useEffect } from 'react';
import '@pages/newtab/Newtab.css';
import { useMomentInHistory } from './hooks/useMomentInHistory';
import { HomePage } from './components/HomePage';
import { Modal } from '../../components/Modal';
import { ToastProvider } from '../../contexts/ToastContext';
import { ThemeProvider } from '../../contexts/ThemeContext';
import { useTranslation } from 'react-i18next';
import { ErrorBoundary } from '../../components/ErrorBoundary';
import { useMenuOrder } from '../../hooks/useMenuOrder';
import { useMenuCustomization } from '../../hooks/useMenuCustomization';
import { MENU_ITEMS } from '../../types/menu';
import { ToolId } from '../../types/tools';
import type { ToolInvocation } from '../../types/toolInvocation';
import { SearchActionTarget } from '../../types/searchActions';
import type { SettingsMenu } from './components/SettingsPage';
import { AI_CONFIGURATION_REQUIRED_EVENT } from '../../utils/aiEvents';
import {
  MAX_SIDEBAR_WIDTH,
  MIN_SIDEBAR_WIDTH,
  sidebarWidth as sidebarWidthStorage,
} from '../../utils/storageManager';

const HistoryPage = lazy(() => import('./components/HistoryPage').then(module => ({ default: module.HistoryPage })));
const BookmarkPage = lazy(() => import('./components/BookmarkPage').then(module => ({ default: module.BookmarkPage })));
const TagsPage = lazy(() => import('./components/TagsPage').then(module => ({ default: module.TagsPage })));
const ToolsPage = lazy(() => import('./components/ToolsPage').then(module => ({ default: module.ToolsPage })));
const SubscriptionsPage = lazy(() => import('./components/SubscriptionsPage').then(module => ({ default: module.SubscriptionsPage })));
const SettingsPage = lazy(() => import('./components/SettingsPage'));
const CommandPalette = lazy(() => import('./components/CommandPalette'));

// =================================================================================
// Main Component
// =================================================================================

// 定义页面类型的联合类型
type Page = 'home' | 'history' | 'bookmarks' | 'tags' | 'tools' | 'subscriptions';
const SIDEBAR_KEYBOARD_STEP = 16;
const SIDEBAR_KEYBOARD_LARGE_STEP = 48;

const PageLoadingFallback: React.FC = () => {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-72 items-center justify-center" role="status" aria-live="polite" aria-label={t('common.loading')}>
      <div className="flex items-center gap-3 nb-text-secondary">
        <span className="unified-search-spinner" aria-hidden="true" />
        <span>{t('common.loading')}</span>
      </div>
    </div>
  );
};

const clampSidebarWidth = (width: number): number => (
  Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_SIDEBAR_WIDTH, Math.round(width)))
);

/**
 * Newtab 组件是新标签页面的主组件。
 * 它负责管理不同的页面视图（主页、历史记录、书签），并协调数据的获取与展示。
 */
export default function Newtab() {
  const { t } = useTranslation();
  // 页面状态管理，用于在 'home', 'history', 'bookmarks' 之间切换
  const [page, setPage] = useState<Page>('home');
  const [requestedToolId, setRequestedToolId] = useState<ToolId | null>(null);
  const [requestedToolInvocation, setRequestedToolInvocation] = useState<ToolInvocation | null>(null);
  const [requestedTagName, setRequestedTagName] = useState<string | null>(null);
  const [requestedBookmarkEditId, setRequestedBookmarkEditId] = useState<string | null>(null);
  const [requestedSubscriptionId, setRequestedSubscriptionId] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsMenu, setSettingsMenu] = useState<SettingsMenu | undefined>();
  const [isAISetupOpen, setIsAISetupOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
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

  const handleOpenTool = (toolId: ToolId, invocation?: ToolInvocation) => {
    setRequestedToolId(toolId);
    setRequestedToolInvocation(invocation ?? null);
    setPage('tools');
    setIsMobileSidebarOpen(false);
  };

  const handleToolInvocationHandled = (id: string) => {
    setRequestedToolInvocation(current => current?.id === id ? null : current);
  };

  const handleOpenTag = (tagName: string) => {
    setRequestedTagName(tagName);
    setPage('tags');
    setIsMobileSidebarOpen(false);
  };

  const handleEditBookmarkFromTag = (bookmarkId: string) => {
    setRequestedBookmarkEditId(bookmarkId);
    setPage('bookmarks');
    setIsMobileSidebarOpen(false);
  };

  const handleOpenSubscription = (subscriptionId: string) => {
    setRequestedSubscriptionId(subscriptionId);
    setPage('subscriptions');
    setIsMobileSidebarOpen(false);
  };

  const handleOpenAction = (target: SearchActionTarget) => {
    if (target.kind === 'settings') {
      setSettingsMenu(target.section);
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

  const handleOpenSettings = (menu?: SettingsMenu) => {
    setSettingsMenu(menu);
    setIsSettingsOpen(true);
    setIsMobileSidebarOpen(false);
  };

  useEffect(() => {
    const handleAIConfigurationRequired = () => setIsAISetupOpen(true);
    window.addEventListener(AI_CONFIGURATION_REQUIRED_EVENT, handleAIConfigurationRequired);
    return () => window.removeEventListener(AI_CONFIGURATION_REQUIRED_EVENT, handleAIConfigurationRequired);
  }, []);

  useEffect(() => {
    const handleCommandPaletteShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setIsCommandPaletteOpen(true);
      }
    };
    window.addEventListener('keydown', handleCommandPaletteShortcut);
    return () => window.removeEventListener('keydown', handleCommandPaletteShortcut);
  }, []);

  const updateSidebarWidth = (nextWidth: number) => {
    const clampedWidth = clampSidebarWidth(nextWidth);
    setSidebarWidth(clampedWidth);
    sidebarWidthStorage.set(clampedWidth);
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

      updateSidebarWidth(e.clientX);
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

  const handleResizeKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? SIDEBAR_KEYBOARD_LARGE_STEP : SIDEBAR_KEYBOARD_STEP;

    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      updateSidebarWidth(sidebarWidth - step);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      updateSidebarWidth(sidebarWidth + step);
    } else if (event.key === 'Home') {
      event.preventDefault();
      updateSidebarWidth(MIN_SIDEBAR_WIDTH);
    } else if (event.key === 'End') {
      event.preventDefault();
      updateSidebarWidth(MAX_SIDEBAR_WIDTH);
    }
  };

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
              onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
            />
          </ErrorBoundary>
        );
      case 'history':
        return (
          <ErrorBoundary>
            <Suspense fallback={<PageLoadingFallback />}><HistoryPage /></Suspense>
          </ErrorBoundary>
        );
      case 'bookmarks':
        return (
          <ErrorBoundary>
            <Suspense fallback={<PageLoadingFallback />}>
              <BookmarkPage
                initialEditBookmarkId={requestedBookmarkEditId}
                onInitialEditHandled={() => setRequestedBookmarkEditId(null)}
              />
            </Suspense>
          </ErrorBoundary>
        );
      case 'tags':
        return (
          <ErrorBoundary>
            <Suspense fallback={<PageLoadingFallback />}>
              <TagsPage
                initialTagName={requestedTagName}
                onInitialTagHandled={() => setRequestedTagName(null)}
                onEditBookmark={handleEditBookmarkFromTag}
              />
            </Suspense>
          </ErrorBoundary>
        );
      case 'tools':
        return (
          <ErrorBoundary>
            <Suspense fallback={<PageLoadingFallback />}>
              <ToolsPage
                initialToolId={requestedToolId}
                initialInvocation={requestedToolInvocation}
                onInvocationHandled={handleToolInvocationHandled}
                onOpenTool={handleOpenTool}
              />
            </Suspense>
          </ErrorBoundary>
        );
      case 'subscriptions':
        return (
          <ErrorBoundary>
            <Suspense fallback={<PageLoadingFallback />}>
              <SubscriptionsPage
                initialSubscriptionId={requestedSubscriptionId}
                onInitialSubscriptionHandled={() => setRequestedSubscriptionId(null)}
              />
            </Suspense>
          </ErrorBoundary>
        );
      default:
        return null;
    }
  };

  const contentCardClassName = page === 'tools'
    ? 'newtab-content-card newtab-content-card--tools flex-1 overflow-hidden'
    : 'newtab-content-card flex-1 nb-card-static p-8 nb-bg-halftone overflow-auto';

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
              onClick={() => handleOpenSettings()}
            >
              <span className="material-symbols-outlined" aria-hidden="true">settings</span>
            </button>
          </header>

          <button
            type="button"
            className={`newtab-sidebar-backdrop ${isMobileSidebarOpen ? 'is-visible' : ''}`}
            aria-label={t('sidebar.closeNavigation')}
            aria-hidden={!isMobileSidebarOpen}
            tabIndex={isMobileSidebarOpen ? 0 : -1}
            onClick={() => setIsMobileSidebarOpen(false)}
          />

          {/* 侧边栏 */}
          <aside
            id="newtab-sidebar"
            ref={sidebarRef}
            aria-label={t('sidebar.navigation')}
            aria-hidden={isCompactLayout && !isMobileSidebarOpen}
            inert={isCompactLayout && !isMobileSidebarOpen ? true : undefined}
            style={{ width: `${sidebarWidth}px` }}
            className={`newtab-sidebar nb-card-static nb-bg-halftone p-8 flex flex-col relative flex-shrink-0 transition-none m-4 mr-0 overflow-hidden ${
              isMobileSidebarOpen ? 'mobile-open' : ''
            }`}
          >
            <button
              type="button"
              className="newtab-sidebar-close"
              aria-label={t('sidebar.closeNavigation')}
              onClick={() => setIsMobileSidebarOpen(false)}
            >
              <span className="material-symbols-outlined text-xl" aria-hidden="true">close</span>
            </button>
            {/* Logo / App Name */}
            <div className="newtab-sidebar-brand relative z-10">
              <div className="newtab-sidebar-logo">
                <h1 className="font-black uppercase leading-none">
                  {t('sidebar.appName')}
                </h1>
              </div>
            </div>

            <button
              type="button"
              className="newtab-command-trigger nb-card-subtle"
              onClick={() => setIsCommandPaletteOpen(true)}
              aria-label={t('commandPalette.open')}
            >
              <span className="material-symbols-outlined text-lg" aria-hidden="true">search</span>
              <span className="min-w-0 flex-1 truncate text-left">{t('commandPalette.open')}</span>
              <kbd>⌘K</kbd>
            </button>

            {/* 导航菜单 */}
            <nav className="flex-1">
              <ul className="space-y-3">
                {menuOrder.map((itemId) => {
                  const item = MENU_ITEMS[itemId];
                  const displayIcon = getItemIcon(itemId, item.icon);
                  return (
                    <li key={itemId}>
                      <button
                        type="button"
                        className={`nb-nav-item ${page === itemId ? 'active' : ''}`}
                        aria-current={page === itemId ? 'page' : undefined}
                        onClick={() => handleNavigate(itemId as Page)}
                      >
                        <span className="material-symbols-outlined text-xl" aria-hidden="true">{displayIcon}</span>
                        <span className="font-bold text-sm uppercase tracking-wide">{t(item.labelKey)}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </nav>

            {/* Settings Entry */}
            <div className="mt-6">
              <button
                type="button"
                onClick={() => handleOpenSettings()}
                className="nb-nav-item"
              >
                <span className="material-symbols-outlined text-xl" aria-hidden="true">settings</span>
                <span className="font-bold text-sm uppercase tracking-wide">{t('sidebar.settings')}</span>
              </button>
            </div>

            {/* 拖拽把手 */}
            <div
              role="separator"
              tabIndex={0}
              aria-label={t('sidebar.resizeSidebar')}
              aria-orientation="vertical"
              aria-valuemin={MIN_SIDEBAR_WIDTH}
              aria-valuemax={MAX_SIDEBAR_WIDTH}
              aria-valuenow={sidebarWidth}
              aria-controls="newtab-main-content"
              onMouseDown={handleMouseDown}
              onKeyDown={handleResizeKeyDown}
              className={`newtab-sidebar-resizer absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-[color:var(--nb-accent-yellow)] transition-colors group ${
                isResizing ? 'bg-[color:var(--nb-accent-pink)]' : ''
              }`}
            />
          </aside>

          {/* 主内容区域 */}
          <main id="newtab-main-content" className="newtab-main flex-1 overflow-hidden nb-bg p-4">
            <div className="h-full flex flex-col gap-4">
              <div className={contentCardClassName}>
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
            <Suspense fallback={<PageLoadingFallback />}>
              <SettingsPage
                onClose={() => setIsSettingsOpen(false)}
                initialMenu={settingsMenu}
              />
            </Suspense>
          </Modal>

          {isCommandPaletteOpen && (
            <Suspense fallback={null}>
              <CommandPalette
                onClose={() => setIsCommandPaletteOpen(false)}
                onOpenTool={handleOpenTool}
                onOpenAction={handleOpenAction}
                onOpenTag={handleOpenTag}
                onOpenSubscription={handleOpenSubscription}
              />
            </Suspense>
          )}

          <Modal
            isOpen={isAISetupOpen}
            onClose={() => setIsAISetupOpen(false)}
            title={t('aiSetup.title')}
            widthClass="max-w-lg"
          >
            <div className="space-y-5">
              <div className="nb-card-subtle p-4">
                <p className="nb-text leading-relaxed">{t('aiSetup.description')}</p>
                <p className="mt-2 text-sm nb-text-secondary">{t('aiSetup.hint')}</p>
              </div>
              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  className="nb-btn nb-btn-secondary"
                  onClick={() => {
                    setIsAISetupOpen(false);
                    handleOpenSettings('LLM');
                  }}
                >
                  {t('aiSetup.enableNano')}
                </button>
                <button
                  type="button"
                  className="nb-btn nb-btn-primary"
                  onClick={() => {
                    setIsAISetupOpen(false);
                    handleOpenSettings('LLM');
                  }}
                >
                  {t('aiSetup.configureProvider')}
                </button>
              </div>
            </div>
          </Modal>
        </div>
      </ToastProvider>
    </ThemeProvider>
  );
}
