import { describe, expect, it } from 'vitest';
import {
  DEFAULT_TOOL_CONFIG,
  ToolId,
  isToolIdValue,
  sanitizeToolConfig,
  sanitizeToolUsageCounts,
} from '../tools';

describe('tool type sanitizers', () => {
  it('filters invalid and duplicate tool ids from tool config', () => {
    expect(sanitizeToolConfig({
      enabledTools: [
        ToolId.JSON_FORMATTER,
        'unknown-tool',
        ToolId.JSON_FORMATTER,
        ToolId.BARK_NOTIFIER,
      ],
      toolOrder: [
        ToolId.BARK_NOTIFIER,
        ToolId.BARK_NOTIFIER,
        42,
        ToolId.JSON_FORMATTER,
      ],
    })).toEqual({
      enabledTools: [ToolId.JSON_FORMATTER, ToolId.BARK_NOTIFIER],
      toolOrder: [ToolId.BARK_NOTIFIER, ToolId.JSON_FORMATTER],
    });
  });

  it('falls back when legacy config is not an object', () => {
    expect(sanitizeToolConfig(null)).toEqual(DEFAULT_TOOL_CONFIG);
    expect(sanitizeToolConfig(['bad'])).toEqual(DEFAULT_TOOL_CONFIG);
  });

  it('recognizes only supported tool ids', () => {
    expect(isToolIdValue(ToolId.HTTP_URL_TESTER)).toBe(true);
    expect(isToolIdValue('not-a-tool')).toBe(false);
  });

  it('filters legacy tool usage counts', () => {
    expect(sanitizeToolUsageCounts({
      [ToolId.JSON_FORMATTER]: 3,
      [ToolId.BARK_NOTIFIER]: 0,
      [ToolId.HTTP_URL_TESTER]: 1.5,
      'unknown-tool': 9,
      [ToolId.PASSWORD_GENERATOR]: -1,
      [ToolId.JWT_DECODER]: '4',
    })).toEqual({
      [ToolId.JSON_FORMATTER]: 3,
      [ToolId.BARK_NOTIFIER]: 0,
    });
  });
});
