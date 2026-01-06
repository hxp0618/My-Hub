import React, { useEffect, useMemo, useState, Suspense, lazy, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ToolId, ToolConfig, getToolMetadata, ToolComponentProps } from '../../../types/tools';
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

const TOOL_LOADERS: Record<ToolId, React.LazyExoticComponent<React.ComponentType<ToolComponentProps>>> = {
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
  [ToolId.PASSWORD_GENERATOR]: lazy(() =>
    import('./tools/PasswordGeneratorTool').then(mod => ({ default: mod.PasswordGeneratorTool })),
  ),
  [ToolId.HTML_TO_MARKDOWN]: lazy(() =>
    import('./tools/HTMLToMarkdownTool').then(mod => ({ default: mod.HTMLToMarkdownTool })),
  ),
  [ToolId.IMAGE_CONVERTER]: lazy(() =>
    import('./tools/ImageConverterTool').then(mod => ({ default: mod.default || mod.ImageConverterTool })),
  ),
  [ToolId.SVG_TOOL]: lazy(() =>
    import('./tools/SVGTool').then(mod => ({ default: mod.default || mod.SVGTool })),
  ),
  [ToolId.HTTP_URL_TESTER]: lazy(() =>
    import('./tools/HTTPUrlTesterTool').then(mod => ({ default: mod.HTTPUrlTesterTool })),
  ),
  [ToolId.YAML_TOML_CONVERTER]: lazy(() =>
    import('./tools/YamlTomlConverterTool').then(mod => ({ default: mod.YamlTomlConverterTool })),
  ),
};

interface ToolsPageProps {}

/**
 * 工具页面主组件
 * 负责：
 * - 渲染工具网格布局
 * - 管理工具的启用/禁用状态
 * - 处理工具管理弹窗
 */
export const ToolsPage: React.FC<ToolsPageProps> = () => {
  const { t } = useTranslation();
  const [config, setConfig] = useState<ToolConfig>({ enabledTools: Object.values(ToolId) });
  const [selectedTool, setSelectedTool] = useState<ToolId | null>(null);
  const [recentToolId, setRecentToolId] = useState<ToolId | null>(null);
  const [isManagementOpen, setIsManagementOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { toolOrder, setToolOrder, moveItem } = useToolOrder();
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

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

        const initialTool =
          (lastSelected && loadedConfig.enabledTools.includes(lastSelected) && lastSelected) ||
          loadedConfig.enabledTools[0] ||
          null;

        setSelectedTool(initialTool);
        setRecentToolId(lastSelected || initialTool);

        if (!lastSelected && initialTool) {
          await setLastSelectedTool(initialTool);
        }
      } catch (error) {
        console.error('Failed to load tool config:', error);
      }
    };

    loadConfig();

    return () => {
      cancelled = true;
    };
  }, []);

  // 保存工具配置和顺序
  const handleSaveConfig = async (newConfig: ToolConfig, newOrder: ToolId[]) => {
    try {
      await setToolConfig(newConfig);
      await saveToolOrder(newOrder);
    } catch (error) {
      console.error('Failed to persist tool config:', error);
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
  const handleSelectTool = (toolId: ToolId) => {
    setSelectedTool(toolId);
    setRecentToolId(toolId);
    setLastSelectedTool(toolId).catch(error => console.error('Failed to save last selected tool:', error));
    incrementToolUsageCount(toolId).catch(error => console.error('Failed to record tool usage:', error));
  };

  // 按顺序排列的启用工具列表
  const orderedEnabledTools = useMemo(() => {
    return toolOrder.filter(id => config.enabledTools.includes(id));
  }, [toolOrder, config.enabledTools]);

  // 键盘快捷键支持
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 如果焦点在输入框中，不处理快捷键
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return;
      }

      const currentIndex = orderedEnabledTools.findIndex(id => id === selectedTool);
      
      if (e.key === 'ArrowUp' && currentIndex > 0) {
        e.preventDefault();
        handleSelectTool(orderedEnabledTools[currentIndex - 1]);
      } else if (e.key === 'ArrowDown' && currentIndex < orderedEnabledTools.length - 1) {
        e.preventDefault();
        handleSelectTool(orderedEnabledTools[currentIndex + 1]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [orderedEnabledTools, selectedTool]);

  // 拖拽事件处理
  const handleDragStart = useCallback((e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOverIndex(null);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent, toIndex: number) => {
      e.preventDefault();
      const fromIndex = parseInt(e.dataTransfer.getData('text/plain'), 10);

      if (!isNaN(fromIndex) && fromIndex !== toIndex) {
        // 计算在完整 toolOrder 中的实际索引
        const fromToolId = orderedEnabledTools[fromIndex];
        const toToolId = orderedEnabledTools[toIndex];
        
        const actualFromIndex = toolOrder.indexOf(fromToolId);
        const actualToIndex = toolOrder.indexOf(toToolId);
        
        if (actualFromIndex !== -1 && actualToIndex !== -1) {
          moveItem(actualFromIndex, actualToIndex);
        }
      }

      setDraggedIndex(null);
      setDragOverIndex(null);
    },
    [toolOrder, orderedEnabledTools, moveItem]
  );

  const handleDragEnd = useCallback(() => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  }, []);

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

  const toolProps = useMemo(
    () => ({
      isExpanded: true,
      onToggleExpand: () => {},
    }),
    [],
  );

  const ToolComponent = selectedTool ? TOOL_LOADERS[selectedTool] : null;

  return (
    <div className="flex h-full nb-bg nb-text">
      {/* 左侧工具列表 - Neo-Brutalism 风格 */}
      <div className="w-72 nb-bg nb-border nb-shadow rounded-xl flex-shrink-0 flex flex-col">
        <div className="p-4 nb-border-b flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold nb-text">{t('tools.title')}</h2>
            <button
              onClick={() => setIsManagementOpen(true)}
              className="nb-btn nb-btn-secondary p-2 h-10 w-10 justify-center"
              title={t('tools.manage')}
            >
              <span className="material-symbols-outlined text-lg">settings</span>
            </button>
          </div>
          
          {/* 搜索框 - Neo-Brutalism 风格 */}
          {config.enabledTools.length > 3 && (
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--nb-text-secondary)] text-lg pointer-events-none z-10">
                search
              </span>
              <input
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

        <nav className="p-3 flex-1 overflow-y-auto space-y-2">
          {filteredTools.map((toolId, index) => {
            const metadata = getToolMetadata(toolId);
            const isSelected = selectedTool === toolId;
            const isRecent = toolId === recentToolId && !searchQuery; // 标记最近使用的工具
            const isDragging = draggedIndex === index;
            const isDragOver = dragOverIndex === index;
            const canDrag = !searchQuery; // 搜索时禁用拖拽
            
            return (
              <button
                key={toolId}
                draggable={canDrag}
                onDragStart={canDrag ? (e) => handleDragStart(e, index) : undefined}
                onDragOver={canDrag ? (e) => handleDragOver(e, index) : undefined}
                onDragLeave={canDrag ? handleDragLeave : undefined}
                onDrop={canDrag ? (e) => handleDrop(e, index) : undefined}
                onDragEnd={canDrag ? handleDragEnd : undefined}
                onClick={() => handleSelectTool(toolId)}
                className={`nb-btn w-full justify-start gap-3 text-left transition-all duration-150 ${
                  isSelected ? 'nb-btn-primary' : 'nb-btn-secondary'
                } ${isDragging ? 'opacity-50 border-dashed' : ''} ${
                  isDragOver ? 'border-[color:var(--nb-accent-yellow)] bg-[color:var(--nb-accent-yellow)]/10' : ''
                } ${canDrag ? 'cursor-move' : ''}`}
              >
                {canDrag && (
                  <span className="material-symbols-outlined text-sm nb-text-secondary">
                    drag_indicator
                  </span>
                )}
                <span className="material-symbols-outlined text-xl">{metadata.icon}</span>
                <div className="flex-1 text-left">
                  <div className="text-sm font-semibold">
                    {t(metadata.nameKey)}
                  </div>
                </div>
                {isRecent && (
                  <span className="nb-badge nb-badge-blue text-xs px-2 py-0.5">
                    {t('tools.recent')}
                  </span>
                )}
              </button>
            );
          })}
          
          {/* 搜索无结果 */}
          {searchQuery && filteredTools.length === 0 && (
            <div className="nb-card-static text-center py-6 px-4">
              <span className="material-symbols-outlined text-4xl text-[color:var(--nb-text-secondary)] mb-2">
                search_off
              </span>
              <p className="text-sm nb-text-secondary">{t('tools.noSearchResults')}</p>
            </div>
          )}
        </nav>

        {/* 空状态 */}
        {orderedEnabledTools.length === 0 && (
          <div className="p-4 text-center">
            <span className="material-symbols-outlined text-4xl text-[color:var(--nb-text-secondary)] mb-2">
              construction
            </span>
            <p className="text-sm nb-text-secondary mb-3">{t('tools.noToolsEnabled')}</p>
            <button
              onClick={() => setIsManagementOpen(true)}
              className="w-full nb-btn nb-btn-primary text-sm"
            >
              {t('tools.enableTools')}
            </button>
          </div>
        )}
      </div>

      {/* 右侧工具内容区 */}
      <div className="flex-1 overflow-y-auto nb-bg p-6">
        {selectedTool ? (
          ToolComponent ? (
            <Suspense
              fallback={
                <div className="h-full flex items-center justify-center nb-text-secondary">
                  {t('common.loading')}
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
                <span className="material-symbols-outlined text-6xl text-[color:var(--nb-text-secondary)] mb-4">
                  warning
                </span>
                <p className="nb-text-secondary text-lg">{t('tools.selectTool')}</p>
              </div>
            </div>
          )
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <span className="material-symbols-outlined text-6xl text-[color:var(--nb-text-secondary)] mb-4">
                construction
              </span>
              <p className="nb-text-secondary text-lg">{t('tools.selectTool')}</p>
            </div>
          </div>
        )}
      </div>

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
