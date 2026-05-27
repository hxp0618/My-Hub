import { describe, expect, it } from 'vitest';
import { convertBase, validateBaseInput } from '../NumberBaseTool';

describe('NumberBaseTool conversions', () => {
  it('converts common values across bases', () => {
    expect(convertBase('255', 'dec')).toMatchObject({
      binary: '11111111',
      octal: '377',
      decimal: '255',
      hexadecimal: 'FF',
      error: null,
    });
  });

  it('keeps large integers precise beyond Number.MAX_SAFE_INTEGER', () => {
    const result = convertBase('9007199254740993', 'dec');

    expect(result.decimal).toBe('9007199254740993');
    expect(result.hexadecimal).toBe('20000000000001');
    expect(result.binary).toBe('100000000000000000000000000000000000000000000000000001');
    expect(result.error).toBeNull();
  });

  it('rejects invalid digits for the selected base', () => {
    expect(validateBaseInput('102', 'bin')).toBe(false);
    expect(convertBase('102', 'bin').error).toBe('invalid');
  });
});
