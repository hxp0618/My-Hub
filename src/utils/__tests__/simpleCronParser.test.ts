import { describe, expect, it } from 'vitest';
import { getNextExecutionTime, parseSimpleCron, validateSimpleCron } from '../simpleCronParser';

describe('simpleCronParser', () => {
  it('parses valid standard five-field cron expressions', () => {
    expect(parseSimpleCron('0 9 * * 1-5')).toMatchObject({
      minute: [0],
      hour: [9],
      weekday: [1, 2, 3, 4, 5],
    });
    expect(validateSimpleCron('*/15 0-23 * * *')).toBe(true);
  });

  it('rejects partial numbers and malformed ranges instead of truncating with parseInt', () => {
    expect(validateSimpleCron('5abc * * * *')).toBe(false);
    expect(validateSimpleCron('*/2abc * * * *')).toBe(false);
    expect(validateSimpleCron('1-5abc * * * *')).toBe(false);
    expect(validateSimpleCron('30-10 * * * *')).toBe(false);
    expect(validateSimpleCron('*/999 * * * *')).toBe(false);
    expect(validateSimpleCron('1,,2 * * * *')).toBe(false);
  });

  it('does not schedule malformed cron expressions', () => {
    expect(getNextExecutionTime('5abc * * * *')).toBeNull();
    expect(getNextExecutionTime('*/2abc * * * *')).toBeNull();
  });
});
