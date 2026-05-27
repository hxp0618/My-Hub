import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  normalizeSVGExportOptions,
  parseSVGExportDimension,
  readSVGFile,
  sanitizeSVG,
  svgToImage,
  validateSVG,
} from '../svgService';
import { DEFAULT_EXPORT_OPTIONS } from '../../types/svg';

class LoadingImage {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;

  set src(_value: string) {
    queueMicrotask(() => this.onload?.());
  }
}

describe('svgService stable errors', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('returns stable validation errors without parser details', () => {
    expect(validateSVG('')).toEqual({ valid: false, error: 'invalidSVG' });

    const result = validateSVG('<svg><path></svg>');

    expect(result.valid).toBe(false);
    expect(result.error).toBe('parseError');
    expect(result.error).not.toContain('parsererror');
  });

  it('normalizes export dimensions before they reach canvas rendering', () => {
    expect(parseSVGExportDimension('512', 128)).toBe(512);
    expect(parseSVGExportDimension('12abc', 128)).toBe(128);
    expect(parseSVGExportDimension('12.5', 128)).toBe(128);
    expect(parseSVGExportDimension(-10, 128)).toBe(128);
    expect(parseSVGExportDimension('999999', 128)).toBe(8192);

    expect(normalizeSVGExportOptions({
      ...DEFAULT_EXPORT_OPTIONS,
      width: Number.NaN,
      height: 999999,
      quality: 500,
    })).toMatchObject({
      width: DEFAULT_EXPORT_OPTIONS.width,
      height: 8192,
      quality: 100,
    });
  });

  it('returns a stable convert error when canvas is unavailable', async () => {
    vi.stubGlobal('Image', LoadingImage);
    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tagName, optionsArg) => {
      if (tagName === 'canvas') {
        return {
          width: 0,
          height: 0,
          getContext: () => null,
        } as unknown as HTMLCanvasElement;
      }

      return originalCreateElement(tagName, optionsArg);
    });

    const result = await svgToImage(
      '<svg width="16" height="16" xmlns="http://www.w3.org/2000/svg"></svg>',
      DEFAULT_EXPORT_OPTIONS
    );

    expect(result).toEqual({ success: false, error: 'convertError' });
  });

  it('rejects unsupported files with a stable error code', async () => {
    await expect(readSVGFile(new File(['plain text'], 'notes.txt', { type: 'text/plain' })))
      .rejects
      .toThrow('unsupportedFormat');
  });

  it('removes active content before SVG preview or conversion', () => {
    const sanitized = sanitizeSVG(`
      <svg width="16" height="16" xmlns="http://www.w3.org/2000/svg">
        <script>alert(1)</script>
        <foreignObject><body onload="alert(2)">bad</body></foreignObject>
        <image href="javascript:alert(3)" onload="alert(4)" />
        <a href="https://example.com"><text>safe</text></a>
      </svg>
    `);

    expect(sanitized).toContain('href="https://example.com"');
    expect(sanitized).not.toContain('<script');
    expect(sanitized).not.toContain('<foreignObject');
    expect(sanitized).not.toContain('javascript:');
    expect(sanitized).not.toContain('onload=');
  });

  it('returns null for invalid SVG when sanitizing', () => {
    expect(sanitizeSVG('<svg><path></svg>')).toBeNull();
  });
});
