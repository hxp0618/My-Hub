import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '../../../../../i18n';
import {
  ConvertOptions,
  ImageInfo,
  createImageBase64Result,
  detectImageMimeType,
  extractImageDataUrlParts,
  convertImage,
  generateOutputFileName,
  getImageBase64ErrorKey,
  getImageExtensionFromMimeType,
  makeUniqueFileName,
  parseIcoSizeOption,
  parseImageQuality,
  parseResizeDimension,
  validateImageFile,
  validateSizeInput,
} from '../ImageConverterTool';

const imageInfo: ImageInfo = {
  id: 'image_1',
  file: new File(['image'], 'example.png', { type: 'image/png' }),
  name: 'example.png',
  originalFormat: 'png',
  width: 10,
  height: 10,
  size: 5,
  dataUrl: 'data:image/png;base64,AAAA',
};

const options: ConvertOptions = {
  targetFormat: 'png',
  quality: 85,
  resize: {
    enabled: false,
    width: 0,
    height: 0,
    maintainAspectRatio: true,
  },
};

class LoadingImage {
  width = 10;
  height = 10;
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;

  set src(_value: string) {
    queueMicrotask(() => this.onload?.());
  }
}

class FailingImage extends LoadingImage {
  set src(_value: string) {
    queueMicrotask(() => this.onerror?.());
  }
}

describe('ImageConverterTool helpers', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('rejects non-image files with a stable error key', () => {
    const result = validateImageFile(new File(['text'], 'notes.txt', { type: 'text/plain' }));

    expect(result).toEqual({ valid: false, error: 'invalidFile' });
  });

  it('parses resize dimensions strictly and clamps oversized values', () => {
    expect(parseResizeDimension('128')).toBe(128);
    expect(parseResizeDimension('00128')).toBe(128);
    expect(parseResizeDimension('12abc')).toBe(0);
    expect(parseResizeDimension('12.5')).toBe(0);
    expect(parseResizeDimension('-12')).toBe(0);
    expect(parseResizeDimension('999999')).toBe(8192);
    expect(validateSizeInput('12abc')).toBe(false);
  });

  it('strictly parses quality and ICO size options', () => {
    expect(parseImageQuality('90')).toBe(90);
    expect(parseImageQuality(' 101 ')).toBe(100);
    expect(parseImageQuality('0')).toBe(1);
    expect(parseImageQuality('90abc', 75)).toBe(75);
    expect(parseImageQuality(Number.NaN, 75)).toBe(75);

    expect(parseIcoSizeOption('64')).toBe(64);
    expect(parseIcoSizeOption(256)).toBe(256);
    expect(parseIcoSizeOption('48abc', 32)).toBe(32);
    expect(parseIcoSizeOption('24', 64)).toBe(64);
    expect(parseIcoSizeOption(undefined, 48)).toBe(48);
  });

  it('sanitizes generated output names and keeps zip names unique', () => {
    expect(generateOutputFileName(' report/final:image?.png ', 'webp')).toBe('report_final_image_.webp');
    expect(generateOutputFileName('...', 'png')).toBe('converted-image.png');

    const usedNames = new Set<string>();
    expect(makeUniqueFileName('photo.png', usedNames)).toBe('photo.png');
    expect(makeUniqueFileName('PHOTO.png', usedNames)).toBe('PHOTO-2.png');
    expect(makeUniqueFileName('photo.png', usedNames)).toBe('photo-3.png');
  });

  it('extracts image data URL parts for Base64 output modes', () => {
    expect(extractImageDataUrlParts('data:image/png;base64,iVBORw0KGgo=')).toEqual({
      mimeType: 'image/png',
      rawBase64: 'iVBORw0KGgo=',
    });
    expect(extractImageDataUrlParts('data:text/plain;base64,aGVsbG8=')).toBeNull();
  });

  it('creates image results from raw Base64 and Data URLs', () => {
    const pngSignatureBase64 = 'iVBORw0KGgo=';

    const rawResult = createImageBase64Result(pngSignatureBase64);
    expect(rawResult.mimeType).toBe('image/png');
    expect(rawResult.extension).toBe('png');
    expect(rawResult.fileName).toBe('base64-image.png');
    expect(rawResult.dataUrl).toBe(`data:image/png;base64,${pngSignatureBase64}`);
    expect(rawResult.size).toBe(8);

    const dataUrlResult = createImageBase64Result(`data:image/jpeg;base64,${pngSignatureBase64}`);
    expect(dataUrlResult.mimeType).toBe('image/jpeg');
    expect(dataUrlResult.extension).toBe('jpg');
  });

  it('detects common image signatures and extensions', () => {
    expect(detectImageMimeType(new Uint8Array([0xff, 0xd8, 0xff]))).toBe('image/jpeg');
    expect(detectImageMimeType(new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"></svg>'))).toBe('image/svg+xml');
    expect(getImageExtensionFromMimeType('image/svg+xml')).toBe('svg');
    expect(getImageExtensionFromMimeType('image/vnd.microsoft.icon')).toBe('ico');
  });

  it('maps invalid Base64 image input to stable error keys', () => {
    try {
      createImageBase64Result('');
      throw new Error('Expected empty input to throw');
    } catch (error) {
      expect(getImageBase64ErrorKey(error)).toBe('emptyBase64Input');
    }

    try {
      createImageBase64Result('aGVsbG8=');
      throw new Error('Expected non-image input to throw');
    } catch (error) {
      expect(getImageBase64ErrorKey(error)).toBe('invalidImageBase64');
    }
  });

  it('uses a localized conversion error instead of raw canvas details', async () => {
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

    const result = await convertImage(imageInfo, options);

    expect(result.success).toBe(false);
    expect(result.error).toBe(i18n.t('tools.imageConverter.convertError'));
    expect(result.error).not.toContain('Canvas context');
  });

  it('uses a localized load error instead of raw image events', async () => {
    vi.stubGlobal('Image', FailingImage);

    const result = await convertImage(imageInfo, options);

    expect(result.success).toBe(false);
    expect(result.error).toBe(i18n.t('tools.imageConverter.loadError'));
    expect(result.error).not.toBe('loadError');
  });
});
