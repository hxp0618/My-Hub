import { describe, expect, it } from 'vitest';
import { parseDragIndex } from '../dragIndex';

describe('parseDragIndex', () => {
  it('accepts integer indexes inside the target list range', () => {
    expect(parseDragIndex('0', 3)).toBe(0);
    expect(parseDragIndex('2', 3)).toBe(2);
  });

  it('rejects malformed index payloads', () => {
    expect(parseDragIndex('', 3)).toBeNull();
    expect(parseDragIndex('1abc', 3)).toBeNull();
    expect(parseDragIndex('-1', 3)).toBeNull();
    expect(parseDragIndex('1.5', 3)).toBeNull();
  });

  it('rejects out-of-range indexes', () => {
    expect(parseDragIndex('3', 3)).toBeNull();
    expect(parseDragIndex('0', 0)).toBeNull();
  });
});
