import { describe, expect, it } from 'vitest';
import { executeRegex } from '../RegexTesterTool';

describe('executeRegex', () => {
  it('returns all global matches with capture groups', () => {
    const result = executeRegex('(hub)', 'gi', 'My Hub, your hub');

    expect(result.error).toBeNull();
    expect(result.matches).toEqual([
      { match: 'Hub', index: 3, groups: ['Hub'] },
      { match: 'hub', index: 13, groups: ['hub'] },
    ]);
  });

  it('returns a stable error code for invalid expressions', () => {
    const result = executeRegex('[', 'g', 'text');

    expect(result.matches).toEqual([]);
    expect(result.error).toBe('invalidExpression');
  });
});
