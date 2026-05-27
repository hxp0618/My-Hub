import { describe, expect, it } from 'vitest';
import { createQRCodeFileName, generateBatchQRCodes, normalizeQRCodeContents } from '../qrcode';
import { DEFAULT_QRCODE_OPTIONS } from '../../types/qrcode';

describe('qrcode utilities', () => {
  it('trims, drops empty lines, and deduplicates batch contents', () => {
    expect(normalizeQRCodeContents([
      ' https://example.com ',
      '',
      'https://example.com',
      '  My Hub  ',
      'My Hub',
    ])).toEqual(['https://example.com', 'My Hub']);
  });

  it('creates safe download filenames with a fallback for non-ascii content', () => {
    expect(createQRCodeFileName('https://example.com/a path?q=1')).toBe('qrcode_https_example_com_a_path_q_1.png');
    expect(createQRCodeFileName('  中文内容  ', 2)).toBe('qrcode_3_content.png');
  });

  it('stores sanitized options for generated batch QR codes', async () => {
    const images = await generateBatchQRCodes(['https://example.com'], {
      ...DEFAULT_QRCODE_OPTIONS,
      size: '512' as unknown as typeof DEFAULT_QRCODE_OPTIONS.size,
      margin: '99' as unknown as number,
    });

    expect(images).toHaveLength(1);
    expect(images[0].options.size).toBe(512);
    expect(images[0].options.margin).toBe(10);
  });
});
