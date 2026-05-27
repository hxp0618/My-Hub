import { describe, expect, it } from 'vitest';
import {
  generateLoremIpsum,
  getLoremMaxCount,
  normalizeLoremCount,
  parseLoremCountInput,
} from '../LoremIpsumTool';

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

  it('normalizes generated counts before building output', () => {
    expect(normalizeLoremCount(Number.NaN, 'words', 7)).toBe(7);
    expect(normalizeLoremCount(Number.POSITIVE_INFINITY, 'paragraphs', 3)).toBe(3);
    expect(normalizeLoremCount(1.5, 'words', 9)).toBe(9);
    expect(normalizeLoremCount(999, 'words')).toBe(500);
  });

  it('keeps generation bounded for non-finite and oversized counts', () => {
    expect(generateLoremIpsum('words', Number.NaN, 'latin').split(' ')).toHaveLength(1);
    expect(generateLoremIpsum('words', Number.POSITIVE_INFINITY, 'latin').split(' ')).toHaveLength(1);
    expect(generateLoremIpsum('words', 999, 'latin').split(' ')).toHaveLength(500);
    expect(generateLoremIpsum('paragraphs', Number.POSITIVE_INFINITY, 'chinese').split('\n\n')).toHaveLength(1);
  });
});
