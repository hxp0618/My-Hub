import { describe, expect, it } from 'vitest';
import { CronField, getFieldMetadata } from '../cron';

describe('cron type helpers', () => {
  it('returns metadata for known fields', () => {
    expect(getFieldMetadata('minute')).toMatchObject({
      key: 'minute',
      min: 0,
      max: 59,
    });
  });

  it('uses a stable error code for unknown fields', () => {
    const rawField = 'secret-field';

    expect(() => getFieldMetadata(rawField as CronField)).toThrow('unknownCronField');

    try {
      getFieldMetadata(rawField as CronField);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      expect(message).not.toContain(rawField);
      expect(message).not.toContain('Unknown cron field');
    }
  });
});
