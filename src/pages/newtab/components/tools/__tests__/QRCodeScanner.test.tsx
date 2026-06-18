import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { QRCodeScanner } from '../qrcode/QRCodeScanner';

const qrcodeMocks = vi.hoisted(() => ({
  blobToDataUrl: vi.fn(),
  decodeQRCode: vi.fn(),
  fetchImageDataUrl: vi.fn(),
  fileToDataUrl: vi.fn(),
  parseOnlineImageUrl: vi.fn((value: string) => {
    try {
      const url = new URL(value.trim());
      return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : null;
    } catch {
      return null;
    }
  }),
}));

vi.mock('../../../../../utils/qrcode', () => qrcodeMocks);

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => ({
      'common.loading': 'Loading...',
      'tools.qrcodeGenerator.imageUrl': 'Online Image URL',
      'tools.qrcodeGenerator.imageUrlPlaceholder': 'Enter QR code image URL...',
      'tools.qrcodeGenerator.scanFromUrl': 'Read Link',
      'tools.qrcodeGenerator.readClipboard': 'Read Clipboard',
      'tools.qrcodeGenerator.imageSourceHint': 'Supports reading online image links directly.',
      'tools.qrcodeGenerator.uploadHint': 'Click, drag, or paste an image here to scan',
      'tools.qrcodeGenerator.pasteHint': 'You can also paste an image or an online image link.',
      'tools.qrcodeGenerator.scanResult': 'Scan Result',
      'tools.qrcodeGenerator.noQRCodeFound': 'No QR code found',
      'tools.qrcodeGenerator.scanFailed': 'Scan failed. Provide a QR code image or an online image link.',
      'tools.qrcodeGenerator.invalidImageUrl': 'Enter a valid http/https image link',
      'tools.qrcodeGenerator.imageUrlLoadError': 'Failed to read the online image. Check the link or site access.',
      'tools.qrcodeGenerator.clipboardUnsupported': 'This browser does not support reading clipboard content',
      'tools.qrcodeGenerator.clipboardReadFailed': 'Failed to read the clipboard. Grant permission and keep the page focused.',
      'tools.qrcodeGenerator.clipboardNoImageOrUrl': 'Clipboard content is not an image or online image link. Scan failed.',
      'tools.qrcodeGenerator.uploadedImages': 'Uploaded Images',
      'tools.qrcodeGenerator.copy': 'Copy',
      'tools.qrcodeGenerator.clear': 'Clear',
    }[key] ?? key),
  }),
}));

function renderScanner() {
  const onAddScanImage = vi.fn();
  render(
    <QRCodeScanner
      scanImages={[]}
      onAddScanImage={onAddScanImage}
      onDelete={vi.fn()}
      onClear={vi.fn()}
    />
  );

  return { onAddScanImage };
}

describe('QRCodeScanner', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    Object.values(qrcodeMocks).forEach(mock => mock.mockClear());
  });

  it('reads an online image URL from the link input', async () => {
    qrcodeMocks.fetchImageDataUrl.mockResolvedValue('data:image/png;base64,qr');
    qrcodeMocks.decodeQRCode.mockResolvedValue('decoded-content');
    const { onAddScanImage } = renderScanner();

    fireEvent.change(screen.getByPlaceholderText('Enter QR code image URL...'), {
      target: { value: ' https://example.com/qrcode.png ' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Read Link' }));

    await waitFor(() => {
      expect(qrcodeMocks.fetchImageDataUrl).toHaveBeenCalledWith('https://example.com/qrcode.png');
    });
    expect(onAddScanImage).toHaveBeenCalledWith('data:image/png;base64,qr', 'decoded-content');
    expect(screen.getByDisplayValue('decoded-content')).toBeInTheDocument();
  });

  it('reads a clipboard text URL as an online image', async () => {
    qrcodeMocks.fetchImageDataUrl.mockResolvedValue('data:image/png;base64,clipboard');
    qrcodeMocks.decodeQRCode.mockResolvedValue('clipboard-result');
    vi.stubGlobal('navigator', {
      clipboard: {
        readText: vi.fn().mockResolvedValue('https://example.com/clipboard.webp'),
      },
    });
    const { onAddScanImage } = renderScanner();

    fireEvent.click(screen.getByRole('button', { name: 'Read Clipboard' }));

    await waitFor(() => {
      expect(qrcodeMocks.fetchImageDataUrl).toHaveBeenCalledWith('https://example.com/clipboard.webp');
    });
    expect(onAddScanImage).toHaveBeenCalledWith('data:image/png;base64,clipboard', 'clipboard-result');
  });

  it('scans a pasted image directly', async () => {
    const imageFile = new File(['qr'], 'qr.png', { type: 'image/png' });
    qrcodeMocks.fileToDataUrl.mockResolvedValue('data:image/png;base64,pasted');
    qrcodeMocks.decodeQRCode.mockResolvedValue('pasted-result');
    const { onAddScanImage } = renderScanner();

    fireEvent.paste(screen.getByText('Click, drag, or paste an image here to scan'), {
      clipboardData: {
        files: [imageFile],
        getData: () => '',
      },
    });

    await waitFor(() => {
      expect(qrcodeMocks.fileToDataUrl).toHaveBeenCalledWith(imageFile);
    });
    expect(qrcodeMocks.fetchImageDataUrl).not.toHaveBeenCalled();
    expect(onAddScanImage).toHaveBeenCalledWith('data:image/png;base64,pasted', 'pasted-result');
  });

  it('shows a scan failure for pasted content that is not an image or URL', () => {
    const { onAddScanImage } = renderScanner();

    fireEvent.paste(screen.getByText('Click, drag, or paste an image here to scan'), {
      clipboardData: {
        files: [],
        getData: () => 'plain text',
      },
    });

    expect(screen.getByText('Clipboard content is not an image or online image link. Scan failed.')).toBeInTheDocument();
    expect(onAddScanImage).not.toHaveBeenCalled();
  });
});
