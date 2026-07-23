import { describe, expect, it } from 'vitest';
import { ToolId } from '../../types/tools';
import {
  prependRecentTool,
  sanitizeToolPreferenceIds,
  toggleFavoriteTool,
} from '../toolPreferences';

describe('toolPreferences', () => {
  it('sanitizes invalid and duplicate tool ids', () => {
    expect(sanitizeToolPreferenceIds([
      ToolId.JSON_FORMATTER,
      'unknown-tool',
      ToolId.JSON_FORMATTER,
      ToolId.URL_CODEC,
    ])).toEqual([ToolId.JSON_FORMATTER, ToolId.URL_CODEC]);
  });

  it('keeps recent tools unique and bounded', () => {
    expect(prependRecentTool([
      ToolId.JSON_FORMATTER,
      ToolId.URL_CODEC,
      ToolId.HASH_CALCULATOR,
    ], ToolId.URL_CODEC, 2)).toEqual([
      ToolId.URL_CODEC,
      ToolId.JSON_FORMATTER,
    ]);
  });

  it('adds and removes favorites without disturbing order', () => {
    expect(toggleFavoriteTool([ToolId.JSON_FORMATTER], ToolId.URL_CODEC)).toEqual([
      ToolId.JSON_FORMATTER,
      ToolId.URL_CODEC,
    ]);
    expect(toggleFavoriteTool([
      ToolId.JSON_FORMATTER,
      ToolId.URL_CODEC,
    ], ToolId.JSON_FORMATTER)).toEqual([ToolId.URL_CODEC]);
  });
});
