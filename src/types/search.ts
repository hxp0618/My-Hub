import { HistoryItem } from '../pages/newtab/types';
import { ToolId } from './tools';
import { SearchActionId, SearchActionTarget } from './searchActions';

export type ToolSearchResultItem = {
  type: 'tool';
  toolId: ToolId;
  title: string;
  description: string;
  icon: string;
  category: string;
};

export type ActionSearchResultItem = {
  type: 'action';
  actionId: SearchActionId;
  title: string;
  description: string;
  icon: string;
  target: SearchActionTarget;
};

export type SearchResultItem =
  | (HistoryItem & { type: 'history' })
  | (chrome.bookmarks.BookmarkTreeNode & { type: 'bookmark' })
  | ToolSearchResultItem
  | ActionSearchResultItem;
