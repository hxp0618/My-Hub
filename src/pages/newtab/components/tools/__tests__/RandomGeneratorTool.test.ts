import { describe, expect, it } from 'vitest';
import { parseClampedIntegerInput, parseIntegerInput } from '../RandomGeneratorTool';

describe('RandomGeneratorTool input parsing', () => {
  it('accepts complete safe integer input', () => {
    expect(parseIntegerInput('42', 0)).toBe(42);
    expect(parseIntegerInput('-7', 0)).toBe(-7);
    expect(parseIntegerInput(' 12 ', 0)).toBe(12);
  });

  it('rejects partial, decimal, empty, and unsafe integer input', () => {
    expect(parseIntegerInput('12abc', 5)).toBe(5);
    expect(parseIntegerInput('1.5', 5)).toBe(5);
    expect(parseIntegerInput('', 5)).toBe(5);
    expect(parseIntegerInput('9007199254740992', 5)).toBe(5);
  });

  it('clamps valid integer input after strict parsing', () => {
    expect(parseClampedIntegerInput('0', 1, 100, 1)).toBe(1);
    expect(parseClampedIntegerInput('128', 1, 64, 21)).toBe(64);
    expect(parseClampedIntegerInput('12abc', 1, 64, 21)).toBe(21);
  });
});
