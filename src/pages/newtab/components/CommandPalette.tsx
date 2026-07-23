import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from '../../../components/Modal';
import { useGlobalSearch } from '../../../hooks/useGlobalSearch';
import { subscriptionService } from '../../../services/SubscriptionService';
import { TagService } from '../../../services/tagService';
import type { SearchResultItem } from '../../../types/search';
import { SEARCH_ACTIONS, type SearchActionTarget } from '../../../types/searchActions';
import { getAllToolsMetadata, type ToolId } from '../../../types/tools';
import { createToolInvocation, type ToolInvocation } from '../../../types/toolInvocation';
import type { Subscription } from '../../../types/subscription';
import type { TagInfo } from '../../../types/tags';
import { webCombos as webComboStorage } from '../../../utils/storageManager';
import type { SettingsMenu } from './SettingsPage';
import type { WebCombo } from '../types';

type CommandGroup = 'smart' | 'actions' | 'tools' | 'tags' | 'bookmarks' | 'history' | 'subscriptions' | 'webCombos';

interface CommandItem {
  id: string;
  group: CommandGroup;
  title: string;
  description: string;
  icon: string;
  score: number;
  run: () => void;
}

interface CommandPaletteProps {
  onClose: () => void;
  onOpenTool: (toolId: ToolId, invocation?: ToolInvocation) => void;
  onOpenAction: (target: SearchActionTarget) => void;
  onOpenTag: (tagName: string) => void;
  onOpenSubscription: (subscriptionId: string) => void;
}

const GROUP_ORDER: CommandGroup[] = [
  'smart',
  'actions',
  'tools',
  'tags',
  'bookmarks',
  'history',
  'subscriptions',
  'webCombos',
];

const SETTINGS_COMMANDS: Array<{ section: SettingsMenu; icon: string; titleKey: string; descriptionKey: string }> = [
  { section: 'General', icon: 'tune', titleKey: 'commandPalette.settings.general.title', descriptionKey: 'commandPalette.settings.general.description' },
  { section: 'Notifications', icon: 'notifications', titleKey: 'commandPalette.settings.notifications.title', descriptionKey: 'commandPalette.settings.notifications.description' },
  { section: 'Permissions', icon: 'shield', titleKey: 'commandPalette.settings.permissions.title', descriptionKey: 'commandPalette.settings.permissions.description' },
  { section: 'Data', icon: 'database', titleKey: 'commandPalette.settings.data.title', descriptionKey: 'commandPalette.settings.data.description' },
  { section: 'LLM', icon: 'psychology', titleKey: 'commandPalette.settings.llm.title', descriptionKey: 'commandPalette.settings.llm.description' },
];

const COMMAND_HINTS = [
  { prefix: 'tool:', labelKey: 'commandPalette.hints.tool' },
  { prefix: 'tag:', labelKey: 'commandPalette.hints.tag' },
  { prefix: 'url:', labelKey: 'commandPalette.hints.url' },
  { prefix: 'action:', labelKey: 'commandPalette.hints.action' },
] as const;

const getRelevance = (query: string, title: string, description = '', keywords: string[] = []): number => {
  if (!query) return 40;
  const normalizedTitle = title.toLowerCase();
  const normalizedDescription = description.toLowerCase();
  if (normalizedTitle === query) return 100;
  if (normalizedTitle.startsWith(query)) return 85;
  if (normalizedTitle.includes(query)) return 70;
  if (keywords.some(keyword => keyword.toLowerCase().includes(query))) return 60;
  if (normalizedDescription.includes(query)) return 45;
  return 0;
};

const openWebCombo = async (combo: WebCombo) => {
  for (const [index, url] of combo.urls.entries()) {
    const hasTabsApi = typeof chrome !== 'undefined' &&
      typeof (chrome as { tabs?: { create?: unknown } }).tabs?.create === 'function';
    if (hasTabsApi) {
      await chrome.tabs.create({ url, active: index === 0 });
    } else {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  }
};

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  onClose,
  onOpenTool,
  onOpenAction,
  onOpenTag,
  onOpenSubscription,
}) => {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [tags, setTags] = useState<TagInfo[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [entitiesLoading, setEntitiesLoading] = useState(true);
  const { results: globalResults, loading: globalLoading } = useGlobalSearch(query);
  const webCombos = useMemo(() => webComboStorage.get(), []);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      TagService.aggregateTags().catch(() => [] as TagInfo[]),
      subscriptionService.getAllSubscriptions().catch(() => [] as Subscription[]),
    ]).then(([nextTags, nextSubscriptions]) => {
      if (cancelled) return;
      setTags(nextTags);
      setSubscriptions(nextSubscriptions);
      setEntitiesLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const normalizedQuery = query.trim().toLowerCase();

  const items = useMemo<CommandItem[]>(() => {
    const commands: CommandItem[] = [];
    const closeAndRun = (run: () => void) => () => {
      onClose();
      run();
    };

    const addGlobalResult = (result: SearchResultItem) => {
      if (result.type === 'tool-intent') {
        commands.push({
          id: `smart-${result.intentId}`,
          group: 'smart',
          title: result.title,
          description: result.description,
          icon: result.icon,
          score: 110 + result.confidence,
          run: closeAndRun(() => onOpenTool(
            result.toolId,
            createToolInvocation(result.toolId, result.input, result.mode, 'home-search'),
          )),
        });
        return;
      }
      if (result.type === 'tool') {
        commands.push({
          id: `tool-${result.toolId}`,
          group: 'tools',
          title: result.title,
          description: result.description,
          icon: result.icon,
          score: getRelevance(normalizedQuery, result.title, result.description),
          run: closeAndRun(() => onOpenTool(result.toolId)),
        });
        return;
      }
      if (result.type === 'action') {
        commands.push({
          id: `action-${result.actionId}`,
          group: 'actions',
          title: result.title,
          description: result.description,
          icon: result.icon,
          score: getRelevance(normalizedQuery, result.title, result.description),
          run: closeAndRun(() => onOpenAction(result.target)),
        });
        return;
      }

      const url = result.url ?? '';
      commands.push({
        id: `${result.type}-${result.type === 'bookmark' ? result.id : url}`,
        group: result.type === 'bookmark' ? 'bookmarks' : 'history',
        title: result.title || url,
        description: url,
        icon: result.type === 'bookmark' ? 'bookmark' : 'history',
        score: getRelevance(normalizedQuery, result.title || '', url),
        run: closeAndRun(() => window.open(url, '_blank', 'noopener,noreferrer')),
      });
    };

    globalResults.forEach(addGlobalResult);

    SEARCH_ACTIONS.forEach(action => {
      const title = t(action.titleKey);
      const description = t(action.descriptionKey);
      const score = getRelevance(normalizedQuery, title, description, action.keywords);
      if (score === 0) return;
      commands.push({
        id: `action-${action.id}`,
        group: 'actions',
        title,
        description,
        icon: action.icon,
        score,
        run: closeAndRun(() => onOpenAction(action.target)),
      });
    });

    SETTINGS_COMMANDS.forEach(command => {
      const title = t(command.titleKey);
      const description = t(command.descriptionKey);
      const score = getRelevance(normalizedQuery, title, description, ['settings', '设置', command.section]);
      if (score === 0) return;
      commands.push({
        id: `settings-${command.section}`,
        group: 'actions',
        title,
        description,
        icon: command.icon,
        score: normalizedQuery ? score + 2 : score - 5,
        run: closeAndRun(() => onOpenAction({ kind: 'settings', section: command.section })),
      });
    });

    if (normalizedQuery) {
      getAllToolsMetadata().forEach(tool => {
        const title = t(tool.nameKey);
        const description = t(tool.descriptionKey);
        const score = getRelevance(normalizedQuery, title, description, [tool.id, tool.category]);
        if (score === 0) return;
        commands.push({
          id: `tool-${tool.id}`,
          group: 'tools',
          title,
          description,
          icon: tool.icon,
          score,
          run: closeAndRun(() => onOpenTool(tool.id)),
        });
      });

      tags.forEach(tag => {
        const score = getRelevance(normalizedQuery, tag.name, t('commandPalette.tagDescription', { count: tag.count }));
        if (score === 0) return;
        commands.push({
          id: `tag-${tag.name}`,
          group: 'tags',
          title: tag.name,
          description: t('commandPalette.tagDescription', { count: tag.count }),
          icon: 'label',
          score,
          run: closeAndRun(() => onOpenTag(tag.name)),
        });
      });

      subscriptions.forEach(subscription => {
        const description = t('commandPalette.subscriptionDescription', { date: new Date(subscription.expiryDate).toLocaleDateString() });
        const score = getRelevance(normalizedQuery, subscription.name, description, [subscription.type, subscription.notes ?? '']);
        if (score === 0) return;
        commands.push({
          id: `subscription-${subscription.id}`,
          group: 'subscriptions',
          title: subscription.name,
          description,
          icon: 'subscriptions',
          score,
          run: closeAndRun(() => onOpenSubscription(subscription.id)),
        });
      });

      webCombos.forEach(combo => {
        const description = t('commandPalette.webComboDescription', { count: combo.urls.length });
        const score = getRelevance(normalizedQuery, combo.title, description, combo.urls);
        if (score === 0) return;
        commands.push({
          id: `web-combo-${combo.id}`,
          group: 'webCombos',
          title: combo.title,
          description,
          icon: 'collections_bookmark',
          score,
          run: closeAndRun(() => { void openWebCombo(combo); }),
        });
      });
    }

    const deduplicated = new Map<string, CommandItem>();
    commands.forEach(command => {
      const existing = deduplicated.get(command.id);
      if (!existing || command.score > existing.score) deduplicated.set(command.id, command);
    });

    return Array.from(deduplicated.values()).sort((a, b) => {
      const groupDifference = GROUP_ORDER.indexOf(a.group) - GROUP_ORDER.indexOf(b.group);
      return groupDifference || b.score - a.score || a.title.localeCompare(b.title);
    });
  }, [globalResults, normalizedQuery, onClose, onOpenAction, onOpenSubscription, onOpenTag, onOpenTool, subscriptions, t, tags, webCombos]);

  const groupedItems = useMemo(() => GROUP_ORDER
    .map(group => ({ group, items: items.filter(item => item.group === group).slice(0, 8) }))
    .filter(group => group.items.length > 0), [items]);
  const visibleItems = useMemo(() => groupedItems.flatMap(group => group.items), [groupedItems]);

  useEffect(() => setActiveIndex(0), [query]);
  useEffect(() => {
    if (activeIndex >= visibleItems.length) setActiveIndex(Math.max(0, visibleItems.length - 1));
  }, [activeIndex, visibleItems.length]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex(index => visibleItems.length ? (index + 1) % visibleItems.length : 0);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex(index => visibleItems.length ? (index - 1 + visibleItems.length) % visibleItems.length : 0);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      visibleItems[activeIndex]?.run();
    }
  };

  let itemIndex = -1;
  const isLoading = globalLoading || entitiesLoading;

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={t('commandPalette.title')}
      widthClass="max-w-3xl"
      initialFocusRef={inputRef}
    >
      <div className="command-palette-shell">
        <div className="command-palette-search">
          <span className="material-symbols-outlined text-xl nb-text-secondary" aria-hidden="true">search</span>
          <input
            ref={inputRef}
            value={query}
            onChange={event => setQuery(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('commandPalette.placeholder')}
            aria-label={t('commandPalette.placeholder')}
            aria-controls="command-palette-results"
            aria-activedescendant={visibleItems[activeIndex] ? `command-${visibleItems[activeIndex].id}` : undefined}
            className="nb-input command-palette-input"
          />
          <kbd className="command-palette-shortcut">⌘/Ctrl K</kbd>
        </div>

        <div className="command-palette-help" aria-label={t('commandPalette.commandHelp')}>
          <span className="command-palette-help-label">{t('commandPalette.commandHelp')}</span>
          {COMMAND_HINTS.map(hint => (
            <button
              key={hint.prefix}
              type="button"
              className="command-palette-chip"
              onClick={() => {
                setQuery(hint.prefix);
                inputRef.current?.focus();
              }}
              title={t(hint.labelKey)}
            >
              <code>{hint.prefix}</code>
              <span>{t(hint.labelKey)}</span>
            </button>
          ))}
        </div>

        <div id="command-palette-results" className="command-palette-results" role="listbox" aria-label={t('commandPalette.results')}>
          {groupedItems.map(group => (
            <section key={group.group} className="command-palette-group">
              <h3 className="command-palette-group-title">{t(`commandPalette.groups.${group.group}`)}</h3>
              <div className="space-y-1">
                {group.items.map(item => {
                  itemIndex += 1;
                  const currentIndex = itemIndex;
                  const isActive = currentIndex === activeIndex;
                  return (
                    <button
                      id={`command-${item.id}`}
                      key={item.id}
                      type="button"
                      role="option"
                      aria-selected={isActive}
                      className={`command-palette-item nb-card-subtle ${isActive ? 'is-active' : ''}`}
                      onMouseEnter={() => setActiveIndex(currentIndex)}
                      onClick={item.run}
                    >
                      <span className="command-palette-item-icon material-symbols-outlined" aria-hidden="true">{item.icon}</span>
                      <span className="min-w-0 flex-1">
                        <span className="command-palette-item-title">{item.title}</span>
                        <span className="command-palette-item-description">{item.description}</span>
                      </span>
                      <span className="material-symbols-outlined text-base nb-text-secondary" aria-hidden="true">arrow_forward</span>
                    </button>
                  );
                })}
              </div>
            </section>
          ))}

          {!isLoading && visibleItems.length === 0 && (
            <div className="command-palette-empty">
              <span className="material-symbols-outlined text-3xl" aria-hidden="true">search_off</span>
              <p>{t('commandPalette.empty')}</p>
            </div>
          )}
          {isLoading && (
            <div className="command-palette-loading" role="status" aria-live="polite">
              <span className="unified-search-spinner" aria-hidden="true" />
              {t('common.loading')}
            </div>
          )}
        </div>
        <p className="command-palette-hint">{t('commandPalette.hint')}</p>
      </div>
    </Modal>
  );
};

export default CommandPalette;
