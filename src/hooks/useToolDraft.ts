import { useCallback, useEffect } from 'react';
import { createLogger } from '../utils/logger';

const logger = createLogger('[useToolDraft]');
const TOOL_DRAFT_PREFIX = 'tool_draft_';
const MAX_DRAFT_TEXT_LENGTH = 500_000;

export interface ToolDraftSnapshot {
  input: string;
  output?: string;
  mode?: string;
  updatedAt: number;
}

const isRecord = (value: unknown): value is Record<string, unknown> => (
  !!value && typeof value === 'object' && !Array.isArray(value)
);

export const sanitizeToolDraft = (value: unknown): ToolDraftSnapshot | null => {
  if (!isRecord(value) || typeof value.input !== 'string' || typeof value.updatedAt !== 'number') return null;
  if (
    value.input.length > MAX_DRAFT_TEXT_LENGTH ||
    (typeof value.output === 'string' && value.output.length > MAX_DRAFT_TEXT_LENGTH)
  ) return null;
  if (!Number.isSafeInteger(value.updatedAt) || value.updatedAt < 0) return null;

  return {
    input: value.input,
    ...(typeof value.output === 'string' ? { output: value.output } : {}),
    ...(typeof value.mode === 'string' && value.mode.length <= 100 ? { mode: value.mode } : {}),
    updatedAt: value.updatedAt,
  };
};

const getDraftKey = (toolId: string): string => `${TOOL_DRAFT_PREFIX}${toolId}`;

export const loadToolDraft = (toolId: string): ToolDraftSnapshot | null => {
  try {
    const stored = localStorage.getItem(getDraftKey(toolId));
    return stored ? sanitizeToolDraft(JSON.parse(stored) as unknown) : null;
  } catch (error) {
    logger.warn(`Failed to load draft for ${toolId}`, error);
    return null;
  }
};

export const saveToolDraft = (toolId: string, snapshot: ToolDraftSnapshot): void => {
  try {
    const sanitized = sanitizeToolDraft(snapshot);
    if (!sanitized || (!sanitized.input && !sanitized.output)) {
      localStorage.removeItem(getDraftKey(toolId));
      return;
    }
    localStorage.setItem(getDraftKey(toolId), JSON.stringify(sanitized));
  } catch (error) {
    logger.warn(`Failed to save draft for ${toolId}`, error);
  }
};

export const removeToolDraft = (toolId: string): void => {
  try {
    localStorage.removeItem(getDraftKey(toolId));
  } catch (error) {
    logger.warn(`Failed to remove draft for ${toolId}`, error);
  }
};

export const useToolDraft = (
  toolId: string,
  snapshot: Omit<ToolDraftSnapshot, 'updatedAt'>,
  debounceMs = 300,
): { clearDraft: () => void } => {
  const { input, output, mode } = snapshot;
  useEffect(() => {
    const timer = window.setTimeout(() => {
      saveToolDraft(toolId, { input, output, mode, updatedAt: Date.now() });
    }, debounceMs);
    return () => window.clearTimeout(timer);
  }, [debounceMs, input, mode, output, toolId]);

  const clearDraft = useCallback(() => removeToolDraft(toolId), [toolId]);
  return { clearDraft };
};

export default useToolDraft;
