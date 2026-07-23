import React, { useEffect, useMemo, useRef, useState, Suspense, lazy, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ToolId, ToolConfig, getToolMetadata, ToolComponentProps } from '../../../types/tools';
import type { ToolInvocation } from '../../../types/toolInvocation';
import {
  getLastSelectedTool,
  getToolConfig,
  incrementToolUsageCount,
  migrateLegacyToolSettings,
  setLastSelectedTool,
  setToolConfig,
  setToolOrder as saveToolOrder,
} from '../../../db/indexedDB';
import { ToolManagementModal } from '../../../components/ToolManagementModal';
import { useToolOrder } from '../../../hooks/useToolOrder';
import { createLogger } from '../../../utils/logger';
import { parseDragIndex } from '../../../utils/dragIndex';
import {
  loadFavoriteTools,
  loadRecentTools,
  prependRecentTool,
  saveFavoriteTools,
  saveRecentTools,
  toggleFavoriteTool,
} from '../../../utils/toolPreferences';

const logger = createLogger('[ToolsPage]');

export const parseToolDragIndex = parseDragIndex;

const TOOL_LOADERS: Record<ToolId, React.LazyExoticComponent<React.ComponentType<ToolComponentProps>>> = {
  [ToolId.SMART_TOOL_ROUTER]: lazy(() =>
    import('./tools/SmartToolRouter').then(mod => ({ default: mod.SmartToolRouter })),
  ),
  [ToolId.JSON_FORMATTER]: lazy(() =>
    import('./tools/JSONFormatterTool').then(mod => ({ default: mod.JSONFormatterTool })),
  ),
  [ToolId.TIMESTAMP_CONVERTER]: lazy(() =>
    import('./tools/TimestampConverterTool').then(mod => ({ default: mod.TimestampConverterTool })),
  ),
  [ToolId.BASE64_CONVERTER]: lazy(() =>
    import('./tools/Base64ConverterTool').then(mod => ({ default: mod.Base64ConverterTool })),
  ),
  [ToolId.URL_CODEC]: lazy(() =>
    import('./tools/URLCodecTool').then(mod => ({ default: mod.URLCodecTool })),
  ),
  [ToolId.TEXT_CRYPTOR]: lazy(() =>
    import('./tools/TextCryptorTool').then(mod => ({ default: mod.TextCryptorTool })),
  ),
  [ToolId.CRON_BUILDER]: lazy(() =>
    import('./tools/CronBuilderTool').then(mod => ({ default: mod.CronBuilderTool })),
  ),
  [ToolId.BARK_NOTIFIER]: lazy(() =>
    import('./tools/BarkNotifierTool').then(mod => ({ default: mod.BarkNotifierTool })),
  ),
  [ToolId.RANDOM_GENERATOR]: lazy(() =>
    import('./tools/RandomGeneratorTool').then(mod => ({ default: mod.RandomGeneratorTool })),
  ),
  [ToolId.HASH_CALCULATOR]: lazy(() =>
    import('./tools/HashCalculatorTool').then(mod => ({ default: mod.HashCalculatorTool })),
  ),
  [ToolId.REGEX_TESTER]: lazy(() =>
    import('./tools/RegexTesterTool').then(mod => ({ default: mod.RegexTesterTool })),
  ),
  [ToolId.COLOR_CONVERTER]: lazy(() =>
    import('./tools/ColorConverterTool').then(mod => ({ default: mod.ColorConverterTool })),
  ),
  [ToolId.QRCODE_GENERATOR]: lazy(() =>
    import('./tools/QRCodeGeneratorTool').then(mod => ({ default: mod.QRCodeGeneratorTool })),
  ),
  [ToolId.DIFF_VIEWER]: lazy(() =>
    import('./tools/DiffViewerTool').then(mod => ({ default: mod.DiffViewerTool })),
  ),
  [ToolId.LOREM_IPSUM]: lazy(() =>
    import('./tools/LoremIpsumTool').then(mod => ({ default: mod.LoremIpsumTool })),
  ),
  [ToolId.NUMBER_BASE]: lazy(() =>
    import('./tools/NumberBaseTool').then(mod => ({ default: mod.NumberBaseTool })),
  ),
  [ToolId.JWT_DECODER]: lazy(() =>
    import('./tools/JWTDecoderTool').then(mod => ({ default: mod.JWTDecoderTool })),
  ),
  [ToolId.MARKDOWN_PREVIEW]: lazy(() =>
    import('./tools/MarkdownPreviewTool').then(mod => ({ default: mod.MarkdownPreviewTool })),
  ),
  [ToolId.HTML_ENTITY]: lazy(() =>
    import('./tools/HTMLEntityTool').then(mod => ({ default: mod.HTMLEntityTool })),
  ),
  [ToolId.HTML_PREVIEW]: lazy(() =>
    import('./tools/HTMLPreviewTool').then(mod => ({ default: mod.HTMLPreviewTool })),
  ),
  [ToolId.PASSWORD_GENERATOR]: lazy(() =>
    import('./tools/PasswordGeneratorTool').then(mod => ({ default: mod.PasswordGeneratorTool })),
  ),
  [ToolId.HTML_TO_MARKDOWN]: lazy(() =>
    import('./tools/HTMLToMarkdownTool').then(mod => ({ default: mod.HTMLToMarkdownTool })),
  ),
  [ToolId.IMAGE_CONVERTER]: lazy(() =>
    import('./tools/ImageConverterTool').then(mod => ({ default: mod.default })),
  ),
  [ToolId.SVG_TOOL]: lazy(() =>
    import('./tools/SVGTool').then(mod => ({ default: mod.default })),
  ),
  [ToolId.HTTP_URL_TESTER]: lazy(() =>
    import('./tools/HTTPUrlTesterTool').then(mod => ({ default: mod.HTTPUrlTesterTool })),
  ),
  [ToolId.YAML_TOML_CONVERTER]: lazy(() =>
    import('./tools/YamlTomlConverterTool').then(mod => ({ default: mod.YamlTomlConverterTool })),
  ),
  [ToolId.UNIT_CONVERTER]: lazy(() =>
    import('./tools/UnitConverterTool').then(mod => ({ default: mod.UnitConverterTool })),
  ),
  [ToolId.CASE_CONVERTER]: lazy(() =>
    import('./tools/CaseConverterTool').then(mod => ({ default: mod.CaseConverterTool })),
  ),
};

interface ToolsPageProps {
  initialToolId?: ToolId | null;
  initialInvocation?: ToolInvocation | null;
  onInvocationHandled?: (id: string) => void;
  onOpenTool?: (toolId: ToolId, invocation?: ToolInvocation) => void;
}

interface ToolNavigationGroup {
  id: string;
  label: string;
  icon: string;
  toolIds: ToolId[];
}

/**
 * 工具页面主组件
 * 负责：
 * - 渲染工具网格布局
 * - 管理工具的启用/禁用状态
 * - 处理工具管理弹窗
 */
export const ToolsPage: React.FC<ToolsPageProps> = ({
  initialToolId = null,
  initialInvocation = null,
  onInvocationHandled,
  onOpenTool,
}) => {
  const { t } = useTranslation();
  const [config, setConfig] = useState<ToolConfig>({ enabledTools: Object.values(ToolId) });
  const [selectedTool, setSelectedTool] = useState<ToolId | null>(null);
  const [recentTools, setRecentTools] = useState<ToolId[]>(loadRecentTools);
  const [favoriteTools, setFavoriteTools] = useState<ToolId[]>(loadFavoriteTools);
  const [isManagementOpen, setIsManagementOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { toolOrder, setToolOrder } = useToolOrder();
  const toolButtonRefs = useRef(new Map<ToolId, HTMLButtonElement>());

  // 从 IndexedDB 加载工具配置和上次选择的工具（包含一次性迁移）
  useEffect(() => {
    let cancelled = false;

    const loadConfig = async () => {
      await migrateLegacyToolSettings();

      try {
        const loadedConfig = await getToolConfig();
        if (cancelled) return;
        setConfig(loadedConfig);

        const lastSelected = await getLastSelectedTool();
        if (cancelled) return;

        const requestedInitialToolId = initialInvocation?.toolId ?? initialToolId;
        const initialTool =
          (requestedInitialToolId && loadedConfig.enabledTools.includes(requestedInitialToolId) && requestedInitialToolId) ||
          (lastSelected && loadedConfig.enabledTools.includes(lastSelected) && lastSelected) ||
          loadedConfig.enabledTools[0] ||
          null;

        setSelectedTool(initialTool);
        if (lastSelected || initialTool) {
          setRecentTools(current => {
            const next = prependRecentTool(current, (lastSelected || initialTool) as ToolId);
            saveRecentTools(next);
            return next;
          });
        }

        if (!lastSelected && initialTool) {
          await setLastSelectedTool(initialTool);
        }
      } catch (error) {
        logger.error('Failed to load tool config', error);
      }
    };

    loadConfig();

    return () => {
      cancelled = true;
    };
  }, [initialInvocation?.toolId, initialToolId]);

  // 保存工具配置和顺序
  const handleSaveConfig = async (newConfig: ToolConfig, newOrder: ToolId[]) => {
    try {
      await setToolConfig(newConfig);
      await saveToolOrder(newOrder);
    } catch (error) {
      logger.error('Failed to persist tool config', error);
    }
    setConfig(newConfig);
    setToolOrder(newOrder);
    // 如果当前选中的工具被禁用，切换到第一个启用的工具
    if (selectedTool && !newConfig.enabledTools.includes(selectedTool)) {
      // 按顺序找到第一个启用的工具
      const orderedEnabledTools = newOrder.filter(id => newConfig.enabledTools.includes(id));
      const fallbackTool = orderedEnabledTools[0] || null;
      setSelectedTool(fallbackTool);
      await setLastSelectedTool(fallbackTool);
    }
  };

  // 选择工具
  const handleSelectTool = useCallback((toolId: ToolId) => {
    setSelectedTool(toolId);
    setRecentTools(current => {
      const next = prependRecentTool(current, toolId);
      saveRecentTools(next);
      return next;
    });
    setLastSelectedTool(toolId).catch(error => logger.error('Failed to save last selected tool', error));
    incrementToolUsageCount(toolId).catch(error => logger.error('Failed to record tool usage', error));
  }, []);

  const handleToggleFavorite = useCallback((toolId: ToolId) => {
    setFavoriteTools(current => {
      const next = toggleFavoriteTool(current, toolId);
      saveFavoriteTools(next);
      return next;
    });
  }, []);

  useEffect(() => {
    const requestedToolId = initialInvocation?.toolId ?? initialToolId;
    if (requestedToolId && config.enabledTools.includes(requestedToolId)) {
      handleSelectTool(requestedToolId);
    }
  }, [config.enabledTools, handleSelectTool, initialInvocation?.toolId, initialToolId]);

  // 按顺序排列的启用工具列表
  const orderedEnabledTools = useMemo(() => {
    return toolOrder.filter(id => config.enabledTools.includes(id));
  }, [toolOrder, config.enabledTools]);

  // 过滤工具列表
  const filteredTools = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return orderedEnabledTools;
    return orderedEnabledTools.filter(toolId => {
      const metadata = getToolMetadata(toolId);
      const name = t(metadata.nameKey).toLowerCase();
      const description = t(metadata.descriptionKey).toLowerCase();
      return name.includes(query) || description.includes(query);
    });
  }, [orderedEnabledTools, searchQuery, t]);

  const navigationGroups = useMemo<ToolNavigationGroup[]>(() => {
    if (searchQuery.trim()) {
      return filteredTools.length > 0
        ? [{ id: 'search', label: t('tools.searchResults'), icon: 'search', toolIds: filteredTools }]
        : [];
    }

    const enabled = new Set(orderedEnabledTools);
    const assigned = new Set<ToolId>();
    const groups: ToolNavigationGroup[] = [];
    const addGroup = (group: ToolNavigationGroup) => {
      const toolIds = group.toolIds.filter(toolId => enabled.has(toolId) && !assigned.has(toolId));
      if (toolIds.length === 0) return;
      toolIds.forEach(toolId => assigned.add(toolId));
      groups.push({ ...group, toolIds });
    };

    addGroup({
      id: 'recent',
      label: t('tools.groups.recent'),
      icon: 'history',
      toolIds: recentTools.filter(toolId => !favoriteTools.includes(toolId)),
    });
    addGroup({ id: 'favorites', label: t('tools.groups.favorites'), icon: 'star', toolIds: favoriteTools });

    (['developer', 'utility', 'network'] as const).forEach(category => {
      addGroup({
        id: category,
        label: t(`tools.groups.${category}`),
        icon: category === 'developer' ? 'code' : category === 'utility' ? 'widgets' : 'language',
        toolIds: orderedEnabledTools.filter(toolId => getToolMetadata(toolId).category === category),
      });
    });

    return groups;
  }, [favoriteTools, filteredTools, orderedEnabledTools, recentTools, searchQuery, t]);

  const navigationTools = useMemo(
    () => navigationGroups.flatMap(group => group.toolIds),
    [navigationGroups],
  );
  const rovingToolId = selectedTool && navigationTools.includes(selectedTool)
    ? selectedTool
    : navigationTools[0] ?? null;

  const focusToolButton = useCallback((toolId: ToolId) => {
    window.requestAnimationFrame(() => toolButtonRefs.current.get(toolId)?.focus());
  }, []);

  const handleRailKeyDown = useCallback((event: React.KeyboardEvent<HTMLElement>) => {
    const target = event.target as HTMLElement;
    const toolButton = target.closest<HTMLButtonElement>('[data-tool-id]');
    if (!toolButton || !event.currentTarget.contains(toolButton)) return;

    const currentToolId = toolButton.dataset.toolId as ToolId | undefined;
    const currentIndex = currentToolId ? navigationTools.indexOf(currentToolId) : -1;
    if (currentIndex < 0) return;

    let nextIndex: number | null = null;
    if (event.key === 'ArrowUp') nextIndex = Math.max(0, currentIndex - 1);
    if (event.key === 'ArrowDown') nextIndex = Math.min(navigationTools.length - 1, currentIndex + 1);
    if (event.key === 'Home') nextIndex = 0;
    if (event.key === 'End') nextIndex = navigationTools.length - 1;
    if (nextIndex === null || nextIndex === currentIndex) return;

    event.preventDefault();
    const nextToolId = navigationTools[nextIndex];
    handleSelectTool(nextToolId);
    focusToolButton(nextToolId);
  }, [focusToolButton, handleSelectTool, navigationTools]);

  const toolProps = useMemo(
    () => ({
      isExpanded: true,
      onToggleExpand: () => { },
      invocation: initialInvocation,
      onInvocationHandled,
      onOpenTool,
    }),
    [initialInvocation, onInvocationHandled, onOpenTool],
  );

  const ToolComponent = selectedTool ? TOOL_LOADERS[selectedTool] : null;

  return (
    <div className="tools-page-shell nb-text">
      {/* 左侧工具列表 */}
      <section className="tools-page-rail nb-card-static" aria-label={t('tools.title')} onKeyDown={handleRailKeyDown}>
        <div className="tools-page-rail-header nb-border-b">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-xl nb-text">construction</span>
              <h2 className="text-lg font-bold nb-text">{t('tools.title')}</h2>
            </div>
            <button
              type="button"
              onClick={() => setIsManagementOpen(true)}
              className="nb-btn nb-btn-ghost p-2"
              aria-label={t('tools.manage')}
              title={t('tools.manage')}
            >
              <span className="material-symbols-outlined text-lg">settings</span>
            </button>
          </div>

          {/* 搜索框 */}
          {config.enabledTools.length > 3 && (
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 nb-text-secondary text-base pointer-events-none">
                search
              </span>
              <input
                aria-label={t('tools.searchPlaceholder')}
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={t('tools.searchPlaceholder')}
                className="nb-input w-full py-2 pr-3 text-sm"
                style={{ paddingLeft: '2.5rem' }}
              />
            </div>
          )}
        </div>

        <nav className="tools-page-list" aria-label={t('tools.navigation')}>
          {navigationGroups.map(group => (
            <section className="tools-page-group" key={group.id} aria-labelledby={`tools-group-${group.id}`}>
              <h3 id={`tools-group-${group.id}`} className="tools-page-group-title">
                <span className="material-symbols-outlined text-sm" aria-hidden="true">{group.icon}</span>
                {group.label}
              </h3>
              <div className="tools-page-group-items">
                {group.toolIds.map(toolId => {
                  const metadata = getToolMetadata(toolId);
                  const isSelected = selectedTool === toolId;
                  const isFavorite = favoriteTools.includes(toolId);
                  const toolName = t(metadata.nameKey);

                  return (
                    <div className={`tools-page-tool-row ${isSelected ? 'is-selected' : ''}`} key={toolId}>
                      <button
                        ref={node => {
                          if (node) toolButtonRefs.current.set(toolId, node);
                          else toolButtonRefs.current.delete(toolId);
                        }}
                        type="button"
                        data-tool-id={toolId}
                        tabIndex={rovingToolId === toolId ? 0 : -1}
                        onClick={() => handleSelectTool(toolId)}
                        aria-current={isSelected ? 'page' : undefined}
                        className={`tools-page-tool-button flex min-w-0 flex-1 items-center gap-2 px-3 py-2.5 text-left transition-colors duration-100 ${isSelected
                          ? 'bg-[color:var(--nb-accent-yellow)] text-[color:var(--nb-text-on-accent)]'
                          : 'bg-transparent hover:bg-[color:var(--nb-panel-muted)]'
                        }`}
                      >
                        <span className={`material-symbols-outlined text-lg ${isSelected ? 'text-[color:var(--nb-text-on-accent)]' : 'nb-text'}`} aria-hidden="true">{metadata.icon}</span>
                        <span className={`flex-1 truncate text-sm font-medium ${isSelected ? 'text-[color:var(--nb-text-on-accent)]' : 'nb-text'}`}>
                          {toolName}
                        </span>
                      </button>
                      <button
                        type="button"
                        className={`tools-page-favorite-button ${isFavorite ? 'is-favorite' : ''}`}
                        onClick={() => handleToggleFavorite(toolId)}
                        aria-label={t(isFavorite ? 'tools.removeFavorite' : 'tools.addFavorite', { name: toolName })}
                        aria-pressed={isFavorite}
                        title={t(isFavorite ? 'tools.removeFavorite' : 'tools.addFavorite', { name: toolName })}
                      >
                        <span className="material-symbols-outlined text-base" aria-hidden="true">{isFavorite ? 'star' : 'star_outline'}</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}

          {/* 搜索无结果 */}
          {searchQuery && navigationTools.length === 0 && (
            <div className="text-center py-8">
              <span className="material-symbols-outlined text-3xl nb-text-secondary mb-2">search_off</span>
              <p className="text-sm nb-text-secondary">{t('tools.noSearchResults')}</p>
            </div>
          )}
        </nav>

        {/* 空状态 */}
        {orderedEnabledTools.length === 0 && (
          <div className="p-4 text-center">
            <span className="material-symbols-outlined text-3xl nb-text-secondary mb-2">construction</span>
            <p className="text-sm nb-text-secondary mb-3">{t('tools.noToolsEnabled')}</p>
            <button
              onClick={() => setIsManagementOpen(true)}
              className="nb-btn nb-btn-primary text-sm w-full"
            >
              {t('tools.enableTools')}
            </button>
          </div>
        )}
      </section>

      {/* 右侧工具内容区 */}
      <section className="tools-page-workbench" aria-live="polite">
        <div className="tools-page-workbench-card nb-card-static">
          {selectedTool ? (
            ToolComponent ? (
              <Suspense
                fallback={
                  <div className="h-full flex items-center justify-center">
                    <div className="flex flex-col items-center gap-4">
                      <div className="relative w-12 h-12">
                        <div className="absolute inset-0 border-2 border-[color:var(--nb-border)]/20"></div>
                        <div className="absolute inset-0 border-2 border-[color:var(--nb-accent-yellow)] border-t-transparent animate-spin"></div>
                      </div>
                      <span className="font-bold nb-text-secondary text-sm">{t('common.loading')}</span>
                    </div>
                  </div>
                }
              >
                <div className="h-full">
                  <ToolComponent {...toolProps} />
                </div>
              </Suspense>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <span className="material-symbols-outlined text-5xl nb-text-secondary mb-4">construction</span>
                  <p className="nb-text-secondary font-medium">{t('tools.selectTool')}</p>
                </div>
              </div>
            )
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <span className="material-symbols-outlined text-5xl nb-text-secondary mb-4">construction</span>
                <p className="nb-text-secondary font-medium">{t('tools.selectTool')}</p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 工具管理弹窗 */}
      <ToolManagementModal
        isOpen={isManagementOpen}
        onClose={() => setIsManagementOpen(false)}
        toolConfig={config}
        toolOrder={toolOrder}
        onSave={handleSaveConfig}
      />
    </div>
  );
};
