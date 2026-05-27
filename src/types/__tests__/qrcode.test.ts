import { describe, expect, it } from 'vitest';
import {
  DEFAULT_QRCODE_OPTIONS,
  parseQRCodeMargin,
  parseQRCodeSize,
  sanitizeQRCodeOptions,
} from '../qrcode';

describe('qrcode option parsing', () => {
  it('only accepts supported QR code sizes', () => {
    expect(parseQRCodeSize('128')).toBe(128);
    expect(parseQRCodeSize('512')).toBe(512);
    expect(parseQRCodeSize('128abc', 256)).toBe(256);
    expect(parseQRCodeSize('255', 384)).toBe(384);
    expect(parseQRCodeSize(999, 512)).toBe(512);
    expect(parseQRCodeSize(Number.NaN, 128)).toBe(128);
  });

  it('strictly parses and clamps QR code margins', () => {
    expect(parseQRCodeMargin('0')).toBe(0);
    expect(parseQRCodeMargin('10')).toBe(10);
    expect(parseQRCodeMargin('99')).toBe(10);
    expect(parseQRCodeMargin('5abc', 2)).toBe(2);
    expect(parseQRCodeMargin('1.5', 2)).toBe(2);
    expect(parseQRCodeMargin(-1, 2)).toBe(0);
    expect(parseQRCodeMargin('-1', 2)).toBe(2);
  });

  it('sanitizes persisted QR code options through the shared parser', () => {
    expect(sanitizeQRCodeOptions({
      size: '512',
      margin: '9',
      errorCorrectionLevel: 'H',
      foregroundColor: '#111111',
      backgroundColor: '#eeeeee',
    })).toEqual({
      size: 512,
      margin: 9,
      errorCorrectionLevel: 'H',
      foregroundColor: '#111111',
      backgroundColor: '#eeeeee',
    });

    expect(sanitizeQRCodeOptions({
      size: '128abc',
      margin: '3abc',
      errorCorrectionLevel: 'X',
      foregroundColor: 123,
      backgroundColor: false,
    })).toEqual(DEFAULT_QRCODE_OPTIONS);
  });
});
