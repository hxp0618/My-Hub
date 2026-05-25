import { MenuItemId } from './menu';

export type SearchActionId =
  | 'home'
  | 'bookmarks'
  | 'tags'
  | 'history'
  | 'subscriptions'
  | 'tools'
  | 'settings';

export type SearchActionTarget =
  | { kind: 'page'; page: MenuItemId }
  | { kind: 'settings' };

export interface SearchActionMetadata {
  id: SearchActionId;
  titleKey: string;
  descriptionKey: string;
  icon: string;
  keywords: string[];
  target: SearchActionTarget;
}

export const SEARCH_ACTIONS: SearchActionMetadata[] = [
  {
    id: 'home',
    titleKey: 'home.actions.home.title',
    descriptionKey: 'home.actions.home.description',
    icon: 'home',
    keywords: ['home', 'dashboard', 'start', '首页', '主页', '常用'],
    target: { kind: 'page', page: 'home' },
  },
  {
    id: 'bookmarks',
    titleKey: 'home.actions.bookmarks.title',
    descriptionKey: 'home.actions.bookmarks.description',
    icon: 'bookmark',
    keywords: ['bookmark', 'bookmarks', 'favorite', '书签', '收藏'],
    target: { kind: 'page', page: 'bookmarks' },
  },
  {
    id: 'tags',
    titleKey: 'home.actions.tags.title',
    descriptionKey: 'home.actions.tags.description',
    icon: 'label',
    keywords: ['tag', 'tags', 'label', '标签'],
    target: { kind: 'page', page: 'tags' },
  },
  {
    id: 'history',
    titleKey: 'home.actions.history.title',
    descriptionKey: 'home.actions.history.description',
    icon: 'history',
    keywords: ['history', 'recent', '浏览历史', '历史'],
    target: { kind: 'page', page: 'history' },
  },
  {
    id: 'subscriptions',
    titleKey: 'home.actions.subscriptions.title',
    descriptionKey: 'home.actions.subscriptions.description',
    icon: 'subscriptions',
    keywords: ['subscription', 'subscriptions', 'renewal', '订阅', '到期'],
    target: { kind: 'page', page: 'subscriptions' },
  },
  {
    id: 'tools',
    titleKey: 'home.actions.tools.title',
    descriptionKey: 'home.actions.tools.description',
    icon: 'construction',
    keywords: ['tool', 'tools', 'utility', '工具'],
    target: { kind: 'page', page: 'tools' },
  },
  {
    id: 'settings',
    titleKey: 'home.actions.settings.title',
    descriptionKey: 'home.actions.settings.description',
    icon: 'settings',
    keywords: ['settings', 'preferences', 'config', '设置', '配置'],
    target: { kind: 'settings' },
  },
];

