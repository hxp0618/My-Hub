import type { ToolId } from './tools';

export type ToolInvocationSource = 'home-search' | 'smart-router';

export interface ToolInvocation {
  id: string;
  toolId: ToolId;
  input: string;
  mode?: string;
  source: ToolInvocationSource;
}

export const createToolInvocation = (
  toolId: ToolId,
  input: string,
  mode: string | undefined,
  source: ToolInvocationSource,
): ToolInvocation => ({
  id: `${source}-${toolId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  toolId,
  input,
  mode,
  source,
});
