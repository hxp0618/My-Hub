import React, { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ScanImage } from '../../../../../types/qrcode';
import { decodeQRCode, fileToDataUrl } from '../../../../../utils/qrcode';

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
  const [latestResult, setLatestResult] = useState<string | null>(null);

  const handleFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith('image/')) return;

      setIsProcessing(true);
      try {
        const dataUrl = await fileToDataUrl(file);
        const content = await decodeQRCode(dataUrl);
        onAddScanImage(dataUrl, content);
        setLatestResult(content);
      } catch {
        setLatestResult(null);
      } finally {
        setIsProcessing(false);
      }
    },
    [onAddScanImage]
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

  return (
    <div className="space-y-4">
      {/* 上传区域 */}
      <div
        onClick={handleClick}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          isDragging
            ? 'border-accent bg-accent/5'
            : 'border-default hover:border-accent hover:bg-secondary'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />
        <span className="material-symbols-outlined text-4xl text-secondary mb-2">
          {isProcessing ? 'hourglass_empty' : 'qr_code_scanner'}
        </span>
        <p className="text-sm text-secondary">
          {isProcessing ? t('common.loading') : t('tools.qrcodeGenerator.uploadHint')}
        </p>
      </div>

      {/* 识别结果 */}
      {latestResult !== null && (
        <div className="space-y-2">
          <label className="text-sm font-medium text-main">
            {t('tools.qrcodeGenerator.scanResult')}
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={latestResult || t('tools.qrcodeGenerator.noQRCodeFound')}
              readOnly
              className="flex-1 px-3 py-2 text-sm bg-secondary border border-default rounded-lg"
            />
            {latestResult && (
              <button
                onClick={() => copyToClipboard(latestResult)}
                className="px-3 py-2 text-sm rounded-lg bg-accent text-white hover:opacity-90 transition-opacity"
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
            <span className="text-sm font-medium text-main">
              {t('tools.qrcodeGenerator.uploadedImages')} ({scanImages.length})
            </span>
            <button
              onClick={onClear}
              className="px-3 py-1 text-xs rounded bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors"
            >
              {t('tools.qrcodeGenerator.clear')}
            </button>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {scanImages.map(image => (
              <div
                key={image.id}
                className="relative group rounded-lg border border-default bg-secondary overflow-hidden"
              >
                {/* 删除按钮 */}
                <button
                  onClick={() => onDelete(image.id)}
                  className="absolute top-2 right-2 z-10 w-6 h-6 rounded-full bg-red-500/80 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                >
                  <span className="material-symbols-outlined text-sm">close</span>
                </button>

                {/* 图片 */}
                <img
                  src={image.originalDataUrl}
                  alt="Uploaded"
                  className="w-full aspect-square object-cover"
                />

                {/* 识别结果 */}
                <div className="p-2 bg-main">
                  <p
                    className={`text-xs truncate ${
                      image.decodedContent ? 'text-main' : 'text-secondary'
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
