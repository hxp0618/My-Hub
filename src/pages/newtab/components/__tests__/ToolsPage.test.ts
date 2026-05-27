import { describe, expect, it } from 'vitest';
import { parseToolDragIndex } from '../ToolsPage';

describe('ToolsPage drag sorting', () => {
  it('accepts in-range integer drag indexes', () => {
    expect(parseToolDragIndex('0', 3)).toBe(0);
    expect(parseToolDragIndex('2', 3)).toBe(2);
  });

  it('rejects malformed drag index payloads', () => {
    expect(parseToolDragIndex('', 3)).toBeNull();
    expect(parseToolDragIndex('1abc', 3)).toBeNull();
    expect(parseToolDragIndex('-1', 3)).toBeNull();
    expect(parseToolDragIndex('1.5', 3)).toBeNull();
  });

  it('rejects out-of-range drag indexes', () => {
    expect(parseToolDragIndex('3', 3)).toBeNull();
    expect(parseToolDragIndex('0', 0)).toBeNull();
  });
});
