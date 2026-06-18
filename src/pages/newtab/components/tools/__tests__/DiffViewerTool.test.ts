import { describe, expect, it } from 'vitest';
import {
  areTextsIdentical,
  computeDiff,
  DIFF_HIGHLIGHT_STYLES,
  normalizeDiffText,
} from '../DiffViewerTool';

describe('DiffViewerTool helpers', () => {
  it('detects changed characters while preserving shared text', () => {
    const diff = computeDiff('hello world', 'hello brave world');

    expect(diff.some(part => !part.added && !part.removed && part.value.includes('hello'))).toBe(true);
    expect(diff.some(part => part.added && part.value.includes('brave'))).toBe(true);
  });

  it('checks text identity exactly', () => {
    expect(areTextsIdentical('same', 'same')).toBe(true);
    expect(areTextsIdentical('same', 'same ')).toBe(false);
  });

  it('uses theme variables for difference highlight colors', () => {
    expect(DIFF_HIGHLIGHT_STYLES.added.backgroundColor).toContain('var(--nb-accent-green)');
    expect(DIFF_HIGHLIGHT_STYLES.removed.backgroundColor).toContain('var(--nb-accent-pink)');
    expect(DIFF_HIGHLIGHT_STYLES.added.backgroundColor).not.toContain('rgba(');
    expect(DIFF_HIGHLIGHT_STYLES.removed.backgroundColor).not.toContain('rgba(');
  });

  it('supports line and word diff granularity', () => {
    const lineDiff = computeDiff('one\ntwo\n', 'one\nthree\n', 'line');
    const wordDiff = computeDiff('hello world', 'hello brave world', 'word');

    expect(lineDiff.some(part => part.removed && part.value === 'two\n')).toBe(true);
    expect(lineDiff.some(part => part.added && part.value === 'three\n')).toBe(true);
    expect(wordDiff.some(part => part.added && part.value.includes('brave'))).toBe(true);
  });

  it('normalizes diff text for ignore options', () => {
    expect(normalizeDiffText('Hello   Hub\n', { ignoreWhitespace: true, ignoreCase: true })).toBe('hello hub');
  });
});
