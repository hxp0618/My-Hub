import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ToolId } from '../../../../types/tools';
import { ToolsPage } from '../ToolsPage';

vi.mock('../../../../db/indexedDB', () => ({
  migrateLegacyToolSettings: vi.fn().mockResolvedValue(undefined),
  getToolConfig: vi.fn().mockResolvedValue({
    enabledTools: [ToolId.SMART_TOOL_ROUTER, ToolId.JSON_FORMATTER, ToolId.URL_CODEC, ToolId.HASH_CALCULATOR],
  }),
  getLastSelectedTool: vi.fn().mockResolvedValue(ToolId.SMART_TOOL_ROUTER),
  setLastSelectedTool: vi.fn().mockResolvedValue(undefined),
  incrementToolUsageCount: vi.fn().mockResolvedValue(undefined),
  setToolConfig: vi.fn().mockResolvedValue(undefined),
  setToolOrder: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../../../hooks/useToolOrder', () => ({
  useToolOrder: () => ({
    toolOrder: [ToolId.SMART_TOOL_ROUTER, ToolId.JSON_FORMATTER, ToolId.URL_CODEC, ToolId.HASH_CALCULATOR],
    setToolOrder: vi.fn(),
  }),
}));

vi.mock('../../../../components/ToolManagementModal', () => ({
  ToolManagementModal: () => null,
}));

vi.mock('../tools/SmartToolRouter', () => ({
  SmartToolRouter: () => <div>Smart workbench</div>,
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => ({
      'tools.title': 'Tools',
      'tools.navigation': 'Tool navigation',
      'tools.manage': 'Manage tools',
      'tools.searchPlaceholder': 'Search tools',
      'tools.groups.recent': 'Recently used',
      'tools.groups.favorites': 'Favorites',
      'tools.groups.developer': 'Developer',
      'tools.groups.utility': 'Utilities',
      'tools.groups.network': 'Network',
      'tools.smartToolRouter.name': 'Smart Processor',
      'tools.smartToolRouter.description': 'Smart description',
      'tools.jsonFormatter.name': 'JSON Formatter',
      'tools.jsonFormatter.description': 'JSON description',
      'tools.urlCodec.name': 'URL Codec',
      'tools.urlCodec.description': 'URL description',
      'tools.hashCalculator.name': 'Hash Calculator',
      'tools.hashCalculator.description': 'Hash description',
      'tools.addFavorite': `Add ${options?.name} to favorites`,
      'tools.removeFavorite': `Remove ${options?.name} from favorites`,
    }[key] ?? key),
  }),
}));

describe('ToolsPage navigation', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('tool_recents', JSON.stringify([ToolId.JSON_FORMATTER]));
    localStorage.setItem('tool_favorites', JSON.stringify([ToolId.URL_CODEC]));
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('groups recent, favorite, and categorized tools without drag handles', async () => {
    render(<ToolsPage />);

    await waitFor(() => expect(screen.getByText('Smart workbench')).toBeInTheDocument());
    expect(screen.getByRole('heading', { name: /Recently used/ })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Favorites/ })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Developer/ })).toBeInTheDocument();
    expect(screen.queryByText('drag_indicator')).not.toBeInTheDocument();
  });

  it('persists favorites and keeps a single roving tab stop', async () => {
    render(<ToolsPage />);
    await waitFor(() => expect(screen.getByText('Smart workbench')).toBeInTheDocument());

    const navigation = screen.getByRole('navigation', { name: 'Tool navigation' });
    const smartButton = within(navigation).getByRole('button', { name: 'Smart Processor' });
    const jsonButton = within(navigation).getByRole('button', { name: 'JSON Formatter' });
    expect(smartButton).toHaveAttribute('tabindex', '0');
    expect(jsonButton).toHaveAttribute('tabindex', '-1');

    fireEvent.click(within(navigation).getByRole('button', { name: 'Add JSON Formatter to favorites' }));
    expect(JSON.parse(localStorage.getItem('tool_favorites') ?? '[]')).toContain(ToolId.JSON_FORMATTER);
  });

  it('moves focus and selection only from a focused tool button', async () => {
    render(<ToolsPage />);
    await waitFor(() => expect(screen.getByText('Smart workbench')).toBeInTheDocument());

    const navigation = screen.getByRole('navigation', { name: 'Tool navigation' });
    const smartButton = within(navigation).getByRole('button', { name: 'Smart Processor' });
    const jsonButton = within(navigation).getByRole('button', { name: 'JSON Formatter' });
    smartButton.focus();
    fireEvent.keyDown(smartButton, { key: 'ArrowDown' });

    await waitFor(() => expect(jsonButton).toHaveFocus());
    expect(jsonButton).toHaveAttribute('aria-current', 'page');
  });
});
