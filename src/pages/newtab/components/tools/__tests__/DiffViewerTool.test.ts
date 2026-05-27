import { describe, expect, it } from 'vitest';
import { areTextsIdentical, computeDiff, DIFF_HIGHLIGHT_STYLES } from '../DiffViewerTool';

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
});
