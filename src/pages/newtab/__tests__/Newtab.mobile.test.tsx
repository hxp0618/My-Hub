import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Newtab from '../Newtab';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => ({
      'sidebar.appName': 'My Hub',
      'sidebar.home': '首页',
      'sidebar.bookmarks': '书签',
      'sidebar.tags': '标签',
      'sidebar.history': '历史',
      'sidebar.subscriptions': '订阅',
      'sidebar.tools': '工具',
      'sidebar.settings': '设置',
      'sidebar.navigation': '主导航',
      'sidebar.openNavigation': '打开导航菜单',
      'sidebar.closeNavigation': '关闭导航菜单',
    }[key] ?? key),
  }),
}));

vi.mock('../../../contexts/ThemeContext', () => ({
  ThemeProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('../../../contexts/ToastContext', () => ({
  ToastProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('../../../components/ErrorBoundary', () => ({
  ErrorBoundary: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('../../../components/Modal', () => ({
  Modal: ({ children, isOpen }: { children: React.ReactNode; isOpen: boolean }) => (
    isOpen ? <div role="dialog">{children}</div> : null
  ),
}));

vi.mock('../hooks/useMomentInHistory', () => ({
  useMomentInHistory: () => ({
    recommendations: [],
    timeRange: null,
    refreshRecommendations: vi.fn(),
  }),
}));

vi.mock('../../../hooks/useMenuOrder', () => ({
  useMenuOrder: () => ({
    menuOrder: ['home', 'bookmarks', 'tags', 'history', 'subscriptions', 'tools'],
  }),
}));

vi.mock('../../../hooks/useMenuCustomization', () => ({
  useMenuCustomization: () => ({
    getItemIcon: (_itemId: string, defaultIcon: string) => defaultIcon,
  }),
}));

vi.mock('../components/HomePage', () => ({
  HomePage: () => <div>首页内容</div>,
}));

vi.mock('../components/HistoryPage', () => ({
  HistoryPage: () => <div>历史内容</div>,
}));

vi.mock('../components/BookmarkPage', () => ({
  BookmarkPage: () => <div>书签内容</div>,
}));

vi.mock('../components/TagsPage', () => ({
  TagsPage: () => <div>标签内容</div>,
}));

vi.mock('../components/ToolsPage', () => ({
  ToolsPage: () => <div>工具内容</div>,
}));

vi.mock('../components/SubscriptionsPage', () => ({
  SubscriptionsPage: () => <div>订阅内容</div>,
}));

vi.mock('../components/SettingsPage', () => ({
  default: () => <div>设置内容</div>,
}));

const setViewportWidth = (width: number) => {
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    writable: true,
    value: width,
  });
};

describe('Newtab mobile sidebar', () => {
  beforeEach(() => {
    localStorage.clear();
    document.body.className = '';
    setViewportWidth(800);
  });

  afterEach(() => {
    cleanup();
    document.body.className = '';
  });

  it('switches to compact layout and toggles the mobile sidebar drawer', async () => {
    const { container } = render(<Newtab />);

    await waitFor(() => {
      expect(container.querySelector('.newtab-shell')).toHaveClass('mobile-layout');
    });

    const sidebar = screen.getByLabelText('主导航');
    const toggleButton = screen.getByRole('button', { name: '打开导航菜单' });

    fireEvent.click(toggleButton);

    expect(sidebar).toHaveClass('mobile-open');
    expect(document.body).toHaveClass('newtab-mobile-nav-open');
    expect(toggleButton).toHaveAttribute('aria-expanded', 'true');

    // 导航后立即收起抽屉，避免窄屏内容被遮罩持续挡住。
    fireEvent.click(screen.getByRole('link', { name: /工具/ }));

    expect(sidebar).not.toHaveClass('mobile-open');
    expect(document.body).not.toHaveClass('newtab-mobile-nav-open');
    expect(screen.getByText('工具内容')).toBeInTheDocument();
  });

  it('falls back to the default sidebar width when saved width is invalid', () => {
    localStorage.setItem('sidebarWidth', '9999');

    render(<Newtab />);

    expect(screen.getByLabelText('主导航')).toHaveStyle({ width: '256px' });
  });

  it('closes the mobile sidebar with Escape', async () => {
    render(<Newtab />);

    fireEvent.click(screen.getByRole('button', { name: '打开导航菜单' }));
    expect(screen.getByLabelText('主导航')).toHaveClass('mobile-open');

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(screen.getByLabelText('主导航')).not.toHaveClass('mobile-open');
    expect(document.body).not.toHaveClass('newtab-mobile-nav-open');
  });

  it('updates compact layout when the viewport crosses the breakpoint', async () => {
    const { container } = render(<Newtab />);

    await waitFor(() => {
      expect(container.querySelector('.newtab-shell')).toHaveClass('mobile-layout');
    });

    act(() => {
      setViewportWidth(1200);
      window.dispatchEvent(new Event('resize'));
    });

    await waitFor(() => {
      expect(container.querySelector('.newtab-shell')).not.toHaveClass('mobile-layout');
    });
  });

  it('closes the mobile sidebar when returning to desktop width', async () => {
    const { container } = render(<Newtab />);

    await waitFor(() => {
      expect(container.querySelector('.newtab-shell')).toHaveClass('mobile-layout');
    });

    fireEvent.click(screen.getByRole('button', { name: '打开导航菜单' }));
    expect(screen.getByLabelText('主导航')).toHaveClass('mobile-open');
    expect(document.body).toHaveClass('newtab-mobile-nav-open');

    act(() => {
      setViewportWidth(1200);
      window.dispatchEvent(new Event('resize'));
    });

    await waitFor(() => {
      expect(container.querySelector('.newtab-shell')).not.toHaveClass('mobile-layout');
    });

    expect(screen.getByLabelText('主导航')).not.toHaveClass('mobile-open');
    expect(document.body).not.toHaveClass('newtab-mobile-nav-open');
  });
});
