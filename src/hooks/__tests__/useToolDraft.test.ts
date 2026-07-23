import { beforeEach, describe, expect, it } from 'vitest';
import {
  loadToolDraft,
  removeToolDraft,
  sanitizeToolDraft,
  saveToolDraft,
} from '../useToolDraft';

describe('tool drafts', () => {
  beforeEach(() => localStorage.clear());

  it('sanitizes malformed snapshots', () => {
    expect(sanitizeToolDraft({ input: 'hello', output: 'world', mode: 'encode', updatedAt: 1 })).toEqual({
      input: 'hello',
      output: 'world',
      mode: 'encode',
      updatedAt: 1,
    });
    expect(sanitizeToolDraft({ input: 'hello', updatedAt: 'now' })).toBeNull();
  });

  it('saves, loads, and removes a per-tool draft', () => {
    saveToolDraft('base64-converter', {
      input: '中文',
      output: '5Lit5paH',
      mode: 'encode',
      updatedAt: 10,
    });
    expect(loadToolDraft('base64-converter')).toMatchObject({ input: '中文', mode: 'encode' });
    removeToolDraft('base64-converter');
    expect(loadToolDraft('base64-converter')).toBeNull();
  });
});
