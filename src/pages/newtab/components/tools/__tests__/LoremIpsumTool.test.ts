import { describe, expect, it } from 'vitest';
import { getLoremMaxCount, parseLoremCountInput } from '../LoremIpsumTool';

describe('LoremIpsumTool input parsing', () => {
  it('uses separate count limits for paragraphs and words', () => {
    expect(getLoremMaxCount('paragraphs')).toBe(20);
    expect(getLoremMaxCount('words')).toBe(500);
  });

  it('accepts complete positive integer input', () => {
    expect(parseLoremCountInput('12', 'paragraphs')).toBe(12);
    expect(parseLoremCountInput(' 250 ', 'words')).toBe(250);
  });

  it('rejects partial, decimal, empty, and unsafe integer input', () => {
    expect(parseLoremCountInput('12abc', 'words', 3)).toBe(3);
    expect(parseLoremCountInput('1.5', 'words', 3)).toBe(3);
    expect(parseLoremCountInput('', 'words', 3)).toBe(3);
    expect(parseLoremCountInput('9007199254740992', 'words', 3)).toBe(3);
  });

  it('clamps counts to mode-specific limits', () => {
    expect(parseLoremCountInput('0', 'paragraphs')).toBe(1);
    expect(parseLoremCountInput('21', 'paragraphs')).toBe(20);
    expect(parseLoremCountInput('501', 'words')).toBe(500);
  });
});
