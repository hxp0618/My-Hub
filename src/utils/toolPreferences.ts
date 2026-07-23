import { ToolId, isToolIdValue } from '../types/tools';
import { createLogger } from './logger';

const logger = createLogger('[toolPreferences]');

export const TOOL_FAVORITES_STORAGE_KEY = 'tool_favorites';
export const TOOL_RECENTS_STORAGE_KEY = 'tool_recents';
export const MAX_RECENT_TOOLS = 5;

export const sanitizeToolPreferenceIds = (value: unknown): ToolId[] => {
  if (!Array.isArray(value)) return [];

  const seen = new Set<ToolId>();
  return value.reduce<ToolId[]>((ids, item) => {
    if (isToolIdValue(item) && !seen.has(item)) {
      seen.add(item);
      ids.push(item);
    }
    return ids;
  }, []);
};

export const prependRecentTool = (
  current: ToolId[],
  toolId: ToolId,
  limit = MAX_RECENT_TOOLS,
): ToolId[] => {
  const safeLimit = Number.isInteger(limit) && limit > 0 ? limit : MAX_RECENT_TOOLS;
  return [toolId, ...sanitizeToolPreferenceIds(current).filter(id => id !== toolId)].slice(0, safeLimit);
};

export const toggleFavoriteTool = (current: ToolId[], toolId: ToolId): ToolId[] => {
  const sanitized = sanitizeToolPreferenceIds(current);
  return sanitized.includes(toolId)
    ? sanitized.filter(id => id !== toolId)
    : [...sanitized, toolId];
};

const readPreference = (key: string): ToolId[] => {
  try {
    const stored = localStorage.getItem(key);
    return stored ? sanitizeToolPreferenceIds(JSON.parse(stored) as unknown) : [];
  } catch (error) {
    logger.warn(`Failed to read ${key}`, error);
    return [];
  }
};

const writePreference = (key: string, toolIds: ToolId[]): void => {
  try {
    localStorage.setItem(key, JSON.stringify(sanitizeToolPreferenceIds(toolIds)));
  } catch (error) {
    logger.warn(`Failed to save ${key}`, error);
  }
};

export const loadFavoriteTools = (): ToolId[] => readPreference(TOOL_FAVORITES_STORAGE_KEY);
export const saveFavoriteTools = (toolIds: ToolId[]): void => writePreference(TOOL_FAVORITES_STORAGE_KEY, toolIds);
export const loadRecentTools = (): ToolId[] => readPreference(TOOL_RECENTS_STORAGE_KEY);
export const saveRecentTools = (toolIds: ToolId[]): void => writePreference(TOOL_RECENTS_STORAGE_KEY, toolIds);
