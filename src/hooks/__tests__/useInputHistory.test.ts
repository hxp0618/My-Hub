import { describe, expect, it } from 'vitest';
import { sanitizeInputHistoryItems } from '../useInputHistory';

describe('useInputHistory sanitizers', () => {
  it('keeps only valid history entries and respects the max item limit', () => {
    expect(sanitizeInputHistoryItems([
      { id: 'a', content: 'first', timestamp: 100 },
      { id: 'a', content: 'duplicate id', timestamp: 101 },
      { id: 'b', content: '   ', timestamp: 102 },
      { id: 'c', content: 'third', timestamp: Number.NaN },
      { id: 'd', content: 'second', timestamp: 103 },
      null,
    ], 2)).toEqual([
      { id: 'a', content: 'first', timestamp: 100 },
      { id: 'd', content: 'second', timestamp: 103 },
    ]);
  });

  it('falls back for malformed history payloads', () => {
    expect(sanitizeInputHistoryItems(null)).toEqual([]);
    expect(sanitizeInputHistoryItems({ id: 'a' })).toEqual([]);
    expect(sanitizeInputHistoryItems([
      { id: '', content: 'missing id', timestamp: 100 },
      { id: 'b', content: 42, timestamp: 101 },
      { id: 'c', content: 'bad timestamp', timestamp: '102' },
    ])).toEqual([]);
  });
});
