import { describe, expect, it } from 'vitest';
import { executeRegex, replaceRegex } from '../RegexTesterTool';

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

  it('returns named capture groups for matches', () => {
    const result = executeRegex('(?<name>hub)-(?<id>\\d+)', 'g', 'hub-42');

    expect(result.error).toBeNull();
    expect(result.matches[0].namedGroups).toEqual({
      name: 'hub',
      id: '42',
    });
  });

  it('replaces text using regex replacement syntax', () => {
    expect(replaceRegex('(?<word>hub)', 'gi', 'hub HUB', '[$<word>]')).toEqual({
      output: '[hub] [HUB]',
      error: null,
    });
  });
});
