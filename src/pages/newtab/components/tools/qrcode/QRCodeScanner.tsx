import React, { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ScanImage } from '../../../../../types/qrcode';
import {
  blobToDataUrl,
  decodeQRCode,
  fetchImageDataUrl,
  fileToDataUrl,
  parseOnlineImageUrl,
} from '../../../../../utils/qrcode';

interface QRCodeScannerProps {
  scanImages: ScanImage[];
  onAddScanImage: (originalDataUrl: string, decodedContent: string | null) => void;
  onDelete: (id: string) => void;
  onClear: () => void;
}

export const QRCodeScanner: React.FC<QRCodeScannerProps> = ({
  scanImages,
  onAddScanImage,
  onDelete,
  onClear,
}) => {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [latestResult, setLatestResult] = useState<string | null | undefined>(undefined);
  const [scanError, setScanError] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState('');

  const markScanFailure = useCallback((message: string) => {
    setLatestResult(undefined);
    setScanError(message);
  }, []);

  const scanDataUrl = useCallback(
    async (dataUrl: string) => {
      const content = await decodeQRCode(dataUrl);
      onAddScanImage(dataUrl, content);
      setLatestResult(content);
      setScanError(null);
    },
    [onAddScanImage]
  );

  const handleImageUrl = useCallback(
    async (url: string) => {
      const normalizedUrl = parseOnlineImageUrl(url);
      if (!normalizedUrl) {
        markScanFailure(t('tools.qrcodeGenerator.invalidImageUrl'));
        return;
      }

      setIsProcessing(true);
      setScanError(null);
      try {
        const dataUrl = await fetchImageDataUrl(normalizedUrl);
        await scanDataUrl(dataUrl);
      } catch (error) {
        const key = error instanceof Error && error.message === 'invalidImageUrl'
          ? 'invalidImageUrl'
          : 'imageUrlLoadError';
        markScanFailure(t(`tools.qrcodeGenerator.${key}`));
      } finally {
        setIsProcessing(false);
      }
    },
    [markScanFailure, scanDataUrl, t]
  );

  const handleFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith('image/')) {
        markScanFailure(t('tools.qrcodeGenerator.scanFailed'));
        return;
      }

      setIsProcessing(true);
      setScanError(null);
      try {
        const dataUrl = await fileToDataUrl(file);
        await scanDataUrl(dataUrl);
      } catch {
        markScanFailure(t('tools.qrcodeGenerator.scanFailed'));
      } finally {
        setIsProcessing(false);
      }
    },
    [markScanFailure, scanDataUrl, t]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
      e.target.value = '';
    },
    [handleFile]
  );

  const copyToClipboard = useCallback((text: string) => {
    navigator.clipboard.writeText(text);
  }, []);

  const handleUrlSubmit = useCallback(() => {
    handleImageUrl(imageUrl);
  }, [handleImageUrl, imageUrl]);

  const handleClipboardRead = useCallback(async () => {
    setIsProcessing(true);
    setScanError(null);
    try {
      if (navigator.clipboard?.read) {
        try {
          const items = await navigator.clipboard.read();
          for (const item of items) {
            const imageType = item.types.find(type => type.startsWith('image/'));
            if (imageType) {
              const blob = await item.getType(imageType);
              const dataUrl = await blobToDataUrl(blob);
              await scanDataUrl(dataUrl);
              return;
            }
          }
        } catch {
          // 某些浏览器不允许读取 ClipboardItem；继续尝试读取文本 URL。
        }
      }

      if (!navigator.clipboard?.readText) {
        markScanFailure(t('tools.qrcodeGenerator.clipboardUnsupported'));
        return;
      }

      const text = await navigator.clipboard.readText();
      const normalizedUrl = parseOnlineImageUrl(text);
      if (!normalizedUrl) {
        markScanFailure(t('tools.qrcodeGenerator.clipboardNoImageOrUrl'));
        return;
      }

      const dataUrl = await fetchImageDataUrl(normalizedUrl);
      await scanDataUrl(dataUrl);
    } catch (error) {
      const key = error instanceof Error && (
        error.message === 'invalidImageUrl' ||
        error.message === 'imageUrlLoadError'
      )
        ? error.message
        : 'clipboardReadFailed';
      markScanFailure(t(`tools.qrcodeGenerator.${key}`));
    } finally {
      setIsProcessing(false);
    }
  }, [markScanFailure, scanDataUrl, t]);

  const handlePaste = useCallback(
    async (event: React.ClipboardEvent) => {
      const imageFile = Array.from(event.clipboardData.files).find(file => file.type.startsWith('image/'));
      if (imageFile) {
        event.preventDefault();
        await handleFile(imageFile);
        return;
      }

      const pastedText = event.clipboardData.getData('text/plain');
      if (!pastedText.trim()) return;

      event.preventDefault();
      const normalizedUrl = parseOnlineImageUrl(pastedText);
      if (normalizedUrl) {
        await handleImageUrl(normalizedUrl);
        return;
      }

      markScanFailure(t('tools.qrcodeGenerator.clipboardNoImageOrUrl'));
    },
    [handleFile, handleImageUrl, markScanFailure, t]
  );

  return (
    <div className="space-y-4" onPaste={handlePaste}>
      {/* 在线图片链接 / 剪贴板 */}
      <div className="nb-card-static p-4 space-y-3">
        <div>
          <label className="block text-sm font-medium nb-text mb-2">
            {t('tools.qrcodeGenerator.imageUrl')}
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              type="url"
              value={imageUrl}
              onChange={e => setImageUrl(e.target.value)}
              onKeyDown={event => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  handleUrlSubmit();
                }
              }}
              placeholder={t('tools.qrcodeGenerator.imageUrlPlaceholder')}
              className="nb-input min-w-0 flex-1 text-sm py-2 px-3"
            />
            <button
              type="button"
              onClick={handleUrlSubmit}
              disabled={!imageUrl.trim() || isProcessing}
              className="nb-btn nb-btn-primary text-sm px-3 py-2 gap-1.5"
            >
              <span className="material-symbols-outlined text-lg" aria-hidden="true">link</span>
              {t('tools.qrcodeGenerator.scanFromUrl')}
            </button>
            <button
              type="button"
              onClick={handleClipboardRead}
              disabled={isProcessing}
              className="nb-btn nb-btn-secondary text-sm px-3 py-2 gap-1.5"
            >
              <span className="material-symbols-outlined text-lg" aria-hidden="true">content_paste</span>
              {t('tools.qrcodeGenerator.readClipboard')}
            </button>
          </div>
        </div>
        <p className="text-xs leading-5 nb-text-secondary">
          {t('tools.qrcodeGenerator.imageSourceHint')}
        </p>
      </div>

      {/* 上传区域 */}
      <div
        onClick={handleClick}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`border-2 border-dashed border-[color:var(--nb-border)] rounded-md p-8 text-center cursor-pointer transition-colors ${
          isDragging
            ? 'bg-[color:var(--nb-accent-yellow)]'
            : 'nb-bg-card hover:bg-[color:var(--nb-bg)]'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />
        <span className={`material-symbols-outlined text-4xl mb-2 ${isDragging ? 'text-[color:var(--nb-text-on-accent)]' : 'nb-text-secondary'}`}>
          {isProcessing ? 'hourglass_empty' : 'qr_code_scanner'}
        </span>
        <p className={`text-sm ${isDragging ? 'text-[color:var(--nb-text-on-accent)]' : 'nb-text-secondary'}`}>
          {isProcessing ? t('common.loading') : t('tools.qrcodeGenerator.uploadHint')}
        </p>
        <p className={`mt-2 text-xs ${isDragging ? 'text-[color:var(--nb-text-on-accent)]' : 'nb-text-secondary'}`}>
          {t('tools.qrcodeGenerator.pasteHint')}
        </p>
      </div>

      {/* 错误提示 */}
      {scanError && (
        <div className="p-3 nb-bg-card nb-border rounded-md" style={{ borderColor: 'var(--nb-accent-pink)' }}>
          <p className="text-sm text-[color:var(--color-error-text)]">{scanError}</p>
        </div>
      )}

      {/* 识别结果 */}
      {latestResult !== undefined && (
        <div className="space-y-2">
          <label className="text-sm font-medium nb-text">
            {t('tools.qrcodeGenerator.scanResult')}
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={latestResult || t('tools.qrcodeGenerator.noQRCodeFound')}
              readOnly
              className="nb-input flex-1 text-sm py-2 px-3"
            />
            {latestResult && (
              <button
                onClick={() => copyToClipboard(latestResult)}
                className="nb-btn nb-btn-primary text-sm px-3 py-2"
              >
                {t('tools.qrcodeGenerator.copy')}
              </button>
            )}
          </div>
        </div>
      )}

      {/* 已上传的图片列表 */}
      {scanImages.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium nb-text">
              {t('tools.qrcodeGenerator.uploadedImages')} ({scanImages.length})
            </span>
            <button
              onClick={onClear}
              className="nb-btn nb-btn-danger text-xs px-3 py-1"
            >
              {t('tools.qrcodeGenerator.clear')}
            </button>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {scanImages.map(image => (
              <div
                key={image.id}
                className="relative group rounded-md border-2 border-[color:var(--nb-border)] nb-bg-card overflow-hidden"
              >
                {/* 删除按钮 */}
                <button
                  type="button"
                  onClick={() => onDelete(image.id)}
                  className="absolute top-2 right-2 z-10 w-11 h-11 rounded-full bg-[color:var(--nb-accent-pink)] border-2 border-[color:var(--nb-border)] text-[color:var(--nb-text-on-accent)] opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus-visible:opacity-100 transition-opacity flex items-center justify-center shadow-[var(--nb-shadow-sm)]"
                  aria-label={t('common.delete')}
                >
                  <span className="material-symbols-outlined text-sm" aria-hidden="true">close</span>
                </button>

                {/* 图片 */}
                <img
                  src={image.originalDataUrl}
                  alt="Uploaded"
                  className="w-full aspect-square object-cover"
                />

                {/* 识别结果 */}
                <div className="p-2 nb-bg">
                  <p
                    className={`text-xs truncate ${
                      image.decodedContent ? 'nb-text' : 'nb-text-secondary'
                    }`}
                    title={image.decodedContent || undefined}
                  >
                    {image.decodedContent || t('tools.qrcodeGenerator.noQRCodeFound')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
