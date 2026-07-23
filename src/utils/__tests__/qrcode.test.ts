import { describe, expect, it } from 'vitest';
import {
  QR_CODE_TEMPLATES,
  buildQRCodeTemplateContent,
  calculateQRCodeLogoBox,
  createQRCodeFileName,
  fetchImageDataUrl,
  generateQRCodeSvg,
  generateBatchQRCodes,
  isLikelyImageUrl,
  normalizeQRCodeContents,
  parseOnlineImageUrl,
} from '../qrcode';
import { DEFAULT_QRCODE_OPTIONS } from '../../types/qrcode';

describe('qrcode utilities', () => {
  it('builds common QR code template payloads', () => {
    expect(buildQRCodeTemplateContent('url', { url: ' example.com/path ' }))
      .toBe('https://example.com/path');
    expect(buildQRCodeTemplateContent('wifi', {
      ssid: 'Office WiFi',
      password: 'p@ss;word',
      encryption: 'WPA',
      hidden: true,
    })).toBe('WIFI:T:WPA;S:Office WiFi;P:p\\@ss\\;word;H:true;;');
    expect(buildQRCodeTemplateContent('email', {
      email: 'team@example.com',
      subject: 'Hello world',
      body: 'Line one',
    })).toBe('mailto:team@example.com?subject=Hello+world&body=Line+one');
    expect(QR_CODE_TEMPLATES.map(template => template.id)).toContain('vcard');
  });

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

  it('generates sanitized SVG output for QR downloads', async () => {
    const svg = await generateQRCodeSvg('https://example.com', DEFAULT_QRCODE_OPTIONS);

    expect(svg).toContain('<svg');
    expect(svg).not.toContain('<script');
  });

  it('calculates a centered logo box with safe ratio bounds', () => {
    expect(calculateQRCodeLogoBox(256, 0.25)).toEqual({
      size: 64,
      x: 96,
      y: 96,
    });
    expect(calculateQRCodeLogoBox(256, 2).size).toBe(102);
    expect(calculateQRCodeLogoBox(256, -1).size).toBe(38);
  });

  it('accepts only http and https image links', () => {
    expect(parseOnlineImageUrl(' https://example.com/qrcode.png ')).toBe('https://example.com/qrcode.png');
    expect(parseOnlineImageUrl('http://example.com/qrcode')).toBe('http://example.com/qrcode');
    expect(parseOnlineImageUrl('data:image/png;base64,abc')).toBeNull();
    expect(parseOnlineImageUrl('not a url')).toBeNull();

    expect(isLikelyImageUrl('https://example.com/qr.webp?size=2')).toBe(true);
    expect(isLikelyImageUrl('https://example.com/file.txt')).toBe(false);
  });

  it('fetches online image links as data URLs', async () => {
    const fetcher = async () => new Response(
      'image-bytes',
      { status: 200, headers: { 'content-type': 'image/png' } },
    );

    await expect(fetchImageDataUrl('https://example.com/qrcode.png', fetcher))
      .resolves.toMatch(/^data:image\/png;base64,/);
  });

  it('allows extension-backed image links when the response has no content type', async () => {
    const fetcher = async () => new Response(new Uint8Array([1, 2, 3]), { status: 200 });

    await expect(fetchImageDataUrl('https://example.com/qrcode.png', fetcher))
      .resolves.toMatch(/^data:application\/octet-stream;base64,|^data:;base64,/);
  });

  it('rejects non-image online responses', async () => {
    const fetcher = async () => new Response(
      'not image',
      { status: 200, headers: { 'content-type': 'text/plain' } },
    );

    await expect(fetchImageDataUrl('https://example.com/readme', fetcher))
      .rejects.toThrow('invalidImageUrl');

    await expect(fetchImageDataUrl('https://example.com/fake.png', fetcher))
      .rejects.toThrow('invalidImageUrl');
  });
});
