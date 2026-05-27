import { describe, expect, it } from 'vitest';
import { isValidJson } from '../httpUtils';

describe('httpUtils', () => {
  it('returns a stable JSON validation error instead of parser details', () => {
    const result = isValidJson('{"token":');

    expect(result).toEqual({ valid: false, error: 'invalidJson' });
    expect(result.error).not.toMatch(/Unexpected|position|unterminated/i);
  });

  it('treats empty request bodies as valid JSON payloads', () => {
    expect(isValidJson('')).toEqual({ valid: true });
    expect(isValidJson('   ')).toEqual({ valid: true });
  });
});
