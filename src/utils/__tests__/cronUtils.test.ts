import { describe, expect, it } from 'vitest';
import { FIELD_METADATA } from '../../types/cron';
import {
  parseCronFieldInput,
  parseFieldExpression,
  validateCronExpression,
} from '../cronUtils';

describe('cronUtils', () => {
  it('returns a stable validation error instead of parser details', () => {
    const result = validateCronExpression('not a cron expression');

    expect(result).toEqual({
      isValid: false,
      error: 'invalidExpression',
    });
    expect(result.error).not.toMatch(/constraint|field|expected|\s/iu);
  });

  it('returns a description key for valid cron expressions', () => {
    expect(validateCronExpression('0 * * * *')).toEqual({
      isValid: true,
      description: 'tools.cronBuilder.desc.everyHour',
    });
  });

  it('strictly parses Cron field UI values and clamps to the field range', () => {
    expect(parseCronFieldInput('12', 0, 59, 5)).toBe(12);
    expect(parseCronFieldInput('12abc', 0, 59, 5)).toBe(5);
    expect(parseCronFieldInput('12.5', 0, 59, 5)).toBe(5);
    expect(parseCronFieldInput(-1, 0, 59, 5)).toBe(5);
    expect(parseCronFieldInput('999', 0, 59, 5)).toBe(59);
  });

  it('rejects partial or out-of-range numbers when parsing expression fields', () => {
    const minuteMeta = FIELD_METADATA.find(meta => meta.key === 'minute')!;

    expect(parseFieldExpression('5abc', minuteMeta)).toEqual({ mode: 'every' });
    expect(parseFieldExpression('5.5', minuteMeta)).toEqual({ mode: 'every' });
    expect(parseFieldExpression('1-99', minuteMeta)).toEqual({ mode: 'every' });
    expect(parseFieldExpression('30-10', minuteMeta)).toEqual({ mode: 'every' });
    expect(parseFieldExpression('*/999', minuteMeta)).toEqual({ mode: 'every' });
    expect(parseFieldExpression('1,2,3', minuteMeta)).toEqual({
      mode: 'specific',
      specificValues: [1, 2, 3],
    });
  });
});
