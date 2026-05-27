import { afterEach, describe, expect, it } from 'vitest';
import {
  loadImagesFromSession,
  loadScanImagesFromSession,
  sanitizeQRCodeImages,
  sanitizeScanImages,
} from '../useQRCodeStorage';
import { DEFAULT_QRCODE_OPTIONS, QRCODE_STORAGE_KEYS } from '../../types/qrcode';

describe('useQRCodeStorage sanitizers', () => {
  afterEach(() => {
    sessionStorage.clear();
  });

  it('keeps recoverable generated QR images and drops invalid cache entries', () => {
    const dataUrl = 'data:image/png;base64,abc';

    expect(sanitizeQRCodeImages([
      {
        id: 'qr-1',
        content: 'https://example.com',
        dataUrl,
        options: {
          size: 999,
          margin: 20,
          errorCorrectionLevel: 'X',
          foregroundColor: 123,
          backgroundColor: '#ffffff',
        },
        createdAt: 100,
      },
      {
        id: 'qr-2',
        content: 'broken',
        dataUrl: 'https://example.com/image.png',
        options: DEFAULT_QRCODE_OPTIONS,
        createdAt: 101,
        selected: true,
      },
      null,
    ])).toEqual([
      {
        id: 'qr-1',
        content: 'https://example.com',
        dataUrl,
        options: {
          ...DEFAULT_QRCODE_OPTIONS,
          margin: 10,
          backgroundColor: '#ffffff',
        },
        createdAt: 100,
        selected: false,
      },
    ]);
  });

  it('loads generated image cache safely from sessionStorage', () => {
    sessionStorage.setItem(QRCODE_STORAGE_KEYS.GENERATED_IMAGES, JSON.stringify([
      {
        id: 'qr-1',
        content: 'hello',
        dataUrl: 'data:image/png;base64,abc',
        options: DEFAULT_QRCODE_OPTIONS,
        createdAt: 100,
        selected: true,
      },
      { id: 'bad' },
    ]));

    expect(loadImagesFromSession()).toHaveLength(1);

    sessionStorage.setItem(QRCODE_STORAGE_KEYS.GENERATED_IMAGES, '{bad-json');
    expect(loadImagesFromSession()).toEqual([]);
  });

  it('loads scan image cache safely from sessionStorage', () => {
    sessionStorage.setItem(QRCODE_STORAGE_KEYS.SCAN_IMAGES, JSON.stringify([
      {
        id: 'scan-1',
        originalDataUrl: 'data:image/jpeg;base64,abc',
        decodedContent: null,
        createdAt: 200,
      },
      {
        id: 'scan-2',
        originalDataUrl: 'data:image/jpeg;base64,def',
        decodedContent: 123,
        createdAt: 201,
      },
    ]));

    expect(loadScanImagesFromSession()).toEqual([
      {
        id: 'scan-1',
        originalDataUrl: 'data:image/jpeg;base64,abc',
        decodedContent: null,
        createdAt: 200,
      },
    ]);

    sessionStorage.setItem(QRCODE_STORAGE_KEYS.SCAN_IMAGES, '{bad-json');
    expect(loadScanImagesFromSession()).toEqual([]);
  });

  it('drops non-array scan cache data', () => {
    expect(sanitizeScanImages({ id: 'scan-1' })).toEqual([]);
  });
});
