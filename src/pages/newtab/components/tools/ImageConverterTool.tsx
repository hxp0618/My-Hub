/**
 * 图片格式转换工具
 * 支持 PNG、JPEG、WebP、GIF、BMP、ICO 格式之间的转换
 */
import { useState, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import JSZip from 'jszip';
import i18n from '../../../../i18n';
import { ToolCard } from '../../../../components/ToolCard';
import { TOOL_METADATA, ToolId, ToolComponentProps } from '../../../../types/tools';
import { useCopyToClipboard } from '../../../../hooks/useCopyToClipboard';

// ==================== 类型定义 ====================

/** 支持的图片格式 */
export type ImageFormat = 'png' | 'jpeg' | 'webp' | 'gif' | 'bmp' | 'ico';

/** 图片信息 */
export interface ImageInfo {
  id: string;
  file: File;
  name: string;
  originalFormat: string;
  width: number;
  height: number;
  size: number;
  dataUrl: string;
}

/** 转换选项 */
export interface ConvertOptions {
  targetFormat: ImageFormat;
  quality: number;
  resize: {
    enabled: boolean;
    width: number;
    height: number;
    maintainAspectRatio: boolean;
  };
  icoSize?: number;
}

/** 转换结果 */
export interface ConvertResult {
  success: boolean;
  originalName: string;
  newName: string;
  blob?: Blob;
  dataUrl?: string;
  size?: number;
  error?: string;
}

/** 批量转换状态 */
export interface BatchConvertState {
  total: number;
  completed: number;
  successful: number;
  failed: number;
  results: ConvertResult[];
}

// ==================== 常量定义 ====================

export const FORMAT_MIME_MAP: Record<ImageFormat, string> = {
  png: 'image/png',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
  bmp: 'image/bmp',
  ico: 'image/x-icon',
};

export const FORMAT_EXTENSION_MAP: Record<ImageFormat, string> = {
  png: '.png',
  jpeg: '.jpg',
  webp: '.webp',
  gif: '.gif',
  bmp: '.bmp',
  ico: '.ico',
};

export const ICO_SIZES = [16, 32, 48, 64, 128, 256];
const SUPPORTED_INPUT_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/bmp'];

// ==================== 工具函数 ====================

export function validateImageFile(file: File): { valid: boolean; error?: string } {
  if (!file.type.startsWith('image/')) {
    return { valid: false, error: 'invalidFile' };
  }
  if (!SUPPORTED_INPUT_TYPES.includes(file.type)) {
    return { valid: false, error: 'invalidFile' };
  }
  return { valid: true };
}

export function loadImage(file: File): Promise<ImageInfo> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const img = new Image();
      img.onload = () => {
        resolve({
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          file,
          name: file.name,
          originalFormat: file.type.split('/')[1] || 'unknown',
          width: img.width,
          height: img.height,
          size: file.size,
          dataUrl,
        });
      };
      img.onerror = () => reject(new Error('loadError'));
      img.src = dataUrl;
    };
    reader.onerror = () => reject(new Error('loadError'));
    reader.readAsDataURL(file);
  });
}

export function calculateAspectRatio(
  originalWidth: number,
  originalHeight: number,
  newWidth?: number,
  newHeight?: number,
  maintainRatio: boolean = true
): { width: number; height: number } {
  if (!maintainRatio) {
    return { width: newWidth || originalWidth, height: newHeight || originalHeight };
  }
  const ratio = originalWidth / originalHeight;
  if (newWidth && !newHeight) return { width: newWidth, height: Math.round(newWidth / ratio) };
  if (newHeight && !newWidth) return { width: Math.round(newHeight * ratio), height: newHeight };
  if (newWidth && newHeight) return { width: newWidth, height: Math.round(newWidth / ratio) };
  return { width: originalWidth, height: originalHeight };
}

export function validateSizeInput(value: string | number): boolean {
  const num = typeof value === 'string' ? parseInt(value, 10) : value;
  return Number.isInteger(num) && num > 0;
}

export function generateOutputFileName(originalName: string, targetFormat: ImageFormat): string {
  const baseName = originalName.replace(/\.[^/.]+$/, '');
  return `${baseName}${FORMAT_EXTENSION_MAP[targetFormat]}`;
}

export function shouldShowQualitySlider(format: ImageFormat): boolean {
  return format === 'jpeg' || format === 'webp';
}

export async function convertImage(imageInfo: ImageInfo, options: ConvertOptions): Promise<ConvertResult> {
  const { targetFormat, quality, resize, icoSize } = options;
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('loadError'));
      img.src = imageInfo.dataUrl;
    });

    let targetWidth = img.width;
    let targetHeight = img.height;

    if (resize.enabled) {
      const calculated = calculateAspectRatio(img.width, img.height, resize.width || undefined, resize.height || undefined, resize.maintainAspectRatio);
      targetWidth = calculated.width;
      targetHeight = calculated.height;
    }

    if (targetFormat === 'ico' && icoSize) {
      targetWidth = icoSize;
      targetHeight = icoSize;
    }

    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas context not available');

    if (targetFormat === 'jpeg') {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, targetWidth, targetHeight);
    }
    ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

    const mimeType = FORMAT_MIME_MAP[targetFormat];
    const qualityValue = shouldShowQualitySlider(targetFormat) ? quality / 100 : undefined;

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Conversion failed'))), mimeType, qualityValue);
    });

    const dataUrl = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });

    return { success: true, originalName: imageInfo.name, newName: generateOutputFileName(imageInfo.name, targetFormat), blob, dataUrl, size: blob.size };
  } catch (error) {
    return { success: false, originalName: imageInfo.name, newName: generateOutputFileName(imageInfo.name, targetFormat), error: error instanceof Error ? error.message : i18n.t('tools.common.unknownError') };
  }
}

export function downloadImage(result: ConvertResult): void {
  if (!result.blob) return;
  const url = URL.createObjectURL(result.blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = result.newName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function downloadAsZip(results: ConvertResult[]): Promise<void> {
  const zip = new JSZip();
  results.filter(r => r.success && r.blob).forEach(r => r.blob && zip.file(r.newName, r.blob));
  const content = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(content);
  const a = document.createElement('a');
  a.href = url;
  a.download = `converted-images-${Date.now()}.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function copyImageToClipboard(blob: Blob): Promise<boolean> {
  try {
    await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
    return true;
  } catch {
    return false;
  }
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}


// ==================== 组件 ====================

export default function ImageConverterTool({ isExpanded, onToggleExpand }: ToolComponentProps) {
  const { t } = useTranslation();
  const { copy } = useCopyToClipboard();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [images, setImages] = useState<ImageInfo[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [options, setOptions] = useState<ConvertOptions>({
    targetFormat: 'png',
    quality: 85,
    resize: { enabled: false, width: 0, height: 0, maintainAspectRatio: true },
    icoSize: 32,
  });
  const [results, setResults] = useState<Map<string, ConvertResult>>(new Map());
  const [isConverting, setIsConverting] = useState(false);
  const [batchState, setBatchState] = useState<BatchConvertState | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedImage = images[selectedIndex];
  const selectedResult = selectedImage ? results.get(selectedImage.id) : undefined;
  const formats: ImageFormat[] = ['png', 'jpeg', 'webp', 'gif', 'bmp', 'ico'];

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const newImages: ImageInfo[] = [];
    for (const file of fileArray) {
      const validation = validateImageFile(file);
      if (!validation.valid) {
        setError(t(`tools.imageConverter.${validation.error}`));
        continue;
      }
      try {
        const imageInfo = await loadImage(file);
        newImages.push(imageInfo);
      } catch {
        setError(t('tools.imageConverter.loadError'));
      }
    }
    if (newImages.length > 0) {
      setImages((prev) => [...prev, ...newImages]);
      setError(null);
    }
  }, [t]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => e.preventDefault(), []);
  const handleUploadClick = () => fileInputRef.current?.click();
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => e.target.files && handleFiles(e.target.files);

  const handleRemoveImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
    if (selectedIndex >= index && selectedIndex > 0) setSelectedIndex(selectedIndex - 1);
  };

  const handleClearAll = () => {
    setImages([]);
    setResults(new Map());
    setSelectedIndex(0);
    setBatchState(null);
  };

  const handleWidthChange = (value: string) => {
    const width = parseInt(value, 10) || 0;
    if (selectedImage && options.resize.maintainAspectRatio) {
      const { height } = calculateAspectRatio(selectedImage.width, selectedImage.height, width, undefined, true);
      setOptions((prev) => ({ ...prev, resize: { ...prev.resize, width, height } }));
    } else {
      setOptions((prev) => ({ ...prev, resize: { ...prev.resize, width } }));
    }
  };

  const handleHeightChange = (value: string) => {
    const height = parseInt(value, 10) || 0;
    if (selectedImage && options.resize.maintainAspectRatio) {
      const { width } = calculateAspectRatio(selectedImage.width, selectedImage.height, undefined, height, true);
      setOptions((prev) => ({ ...prev, resize: { ...prev.resize, width, height } }));
    } else {
      setOptions((prev) => ({ ...prev, resize: { ...prev.resize, height } }));
    }
  };

  const handleConvert = async () => {
    if (!selectedImage) return;
    setIsConverting(true);
    const result = await convertImage(selectedImage, options);
    setResults((prev) => new Map(prev).set(selectedImage.id, result));
    setIsConverting(false);
  };

  const handleConvertAll = async () => {
    if (images.length === 0) return;
    setIsConverting(true);
    setBatchState({ total: images.length, completed: 0, successful: 0, failed: 0, results: [] });
    const newResults = new Map<string, ConvertResult>();
    for (let i = 0; i < images.length; i++) {
      const image = images[i];
      const result = await convertImage(image, options);
      newResults.set(image.id, result);
      setBatchState((prev) => prev ? { ...prev, completed: i + 1, successful: prev.successful + (result.success ? 1 : 0), failed: prev.failed + (result.success ? 0 : 1), results: [...prev.results, result] } : null);
    }
    setResults(newResults);
    setIsConverting(false);
  };

  const handleDownload = (imageId: string) => {
    const result = results.get(imageId);
    if (result) downloadImage(result);
  };

  const handleDownloadAll = async () => {
    const allResults = Array.from(results.values());
    if (allResults.length > 0) await downloadAsZip(allResults);
  };

  const handleCopy = async (imageId: string) => {
    const result = results.get(imageId);
    if (result?.blob) {
      const success = await copyImageToClipboard(result.blob);
      if (!success) setError(t('tools.imageConverter.copyError'));
    }
  };

  return (
    <ToolCard tool={TOOL_METADATA[ToolId.IMAGE_CONVERTER]} isExpanded={isExpanded} onToggleExpand={onToggleExpand}>
      <div className="h-full flex flex-col gap-4">
        {/* 操作按钮 */}
        <div className="flex items-center justify-between flex-shrink-0 flex-wrap gap-2">
          <div className="flex gap-2 flex-wrap">
            <button onClick={handleConvert} disabled={!selectedImage || isConverting} className="nb-btn nb-btn-primary text-sm">
              {isConverting ? t('tools.imageConverter.converting') : t('tools.imageConverter.convert')}
            </button>
            {images.length > 1 && (
              <button onClick={handleConvertAll} disabled={isConverting} className="nb-btn nb-btn-secondary text-sm">
                {t('tools.imageConverter.convertAll')}
              </button>
            )}
            {selectedResult && (
              <>
                <button onClick={() => selectedImage && handleDownload(selectedImage.id)} className="nb-btn nb-btn-secondary text-sm">
                  {t('tools.imageConverter.download')}
                </button>
                <button onClick={() => selectedImage && handleCopy(selectedImage.id)} className="nb-btn nb-btn-secondary text-sm">
                  {t('tools.imageConverter.copy')}
                </button>
              </>
            )}
            {images.length > 0 && (
              <button onClick={handleClearAll} className="nb-btn nb-btn-ghost text-sm">
                {t('tools.imageConverter.clearAll')}
              </button>
            )}
          </div>
          {/* 格式选择 */}
          <div className="flex items-center gap-2">
            <label className="text-sm nb-text-secondary">{t('tools.imageConverter.targetFormat')}:</label>
            <select value={options.targetFormat} onChange={e => setOptions(prev => ({ ...prev, targetFormat: e.target.value as ImageFormat }))} className="nb-input text-sm">
              {formats.map(f => <option key={f} value={f}>{f.toUpperCase()}</option>)}
            </select>
          </div>
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="p-3 nb-bg-card nb-border rounded-lg flex-shrink-0" style={{ borderColor: 'var(--nb-accent-pink)' }}>
            <p className="text-sm" style={{ color: 'var(--nb-accent-pink)' }}>{error}</p>
          </div>
        )}

        {/* 主内容区 */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-0">
          {/* 左侧：上传和图片列表 */}
          <div className="flex flex-col min-h-0 gap-3">
            {/* 上传区域 */}
            <div
              className="border-2 border-dashed border-default rounded-lg p-4 text-center cursor-pointer hover:border-accent transition-colors flex-shrink-0"
              onClick={handleUploadClick}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
            >
              <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileChange} />
              <span className="material-symbols-outlined text-3xl text-secondary">upload</span>
              <p className="text-sm text-main mt-1">{t('tools.imageConverter.uploadHint')}</p>
              <p className="text-xs text-secondary">{t('tools.imageConverter.supportedFormats')}</p>
            </div>

            {/* 图片列表 */}
            {images.length > 0 ? (
              <div className="flex-1 overflow-y-auto border border-default rounded-lg">
                {images.map((image, index) => {
                  const result = results.get(image.id);
                  return (
                    <div
                      key={image.id}
                      className={`flex items-center gap-3 p-3 cursor-pointer transition-colors border-b border-default last:border-b-0 ${selectedIndex === index ? 'nb-selected' : 'hover-bg'}`}
                      onClick={() => setSelectedIndex(index)}
                    >
                      <img src={image.dataUrl} alt={image.name} className="w-10 h-10 object-cover rounded" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-main truncate">{image.name}</p>
                        <p className="text-xs text-secondary">{image.width}×{image.height} · {formatFileSize(image.size)}</p>
                      </div>
                      {result && <span className={`text-sm ${result.success ? 'text-success' : 'text-danger'}`}>{result.success ? '✓' : '✗'}</span>}
                      <button onClick={(e) => { e.stopPropagation(); handleRemoveImage(index); }} className="p-1 hover-bg rounded">
                        <span className="material-symbols-outlined text-sm text-secondary">close</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center border border-default rounded-lg">
                <div className="text-center">
                  <span className="material-symbols-outlined text-4xl text-secondary">image</span>
                  <p className="text-sm text-secondary mt-2">{t('tools.imageConverter.noImages')}</p>
                </div>
              </div>
            )}

            {/* 批量进度 */}
            {batchState && (
              <div className="p-3 bg-secondary rounded-lg flex-shrink-0">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-main">{t('tools.imageConverter.batchProgress')}</span>
                  <span className="text-secondary">{batchState.completed}/{batchState.total}</span>
                </div>
                <div className="w-full h-2 bg-main rounded-full overflow-hidden">
                  <div className="h-full bg-accent transition-all" style={{ width: `${(batchState.completed / batchState.total) * 100}%` }} />
                </div>
                <div className="flex justify-between items-center mt-2">
                  <div className="flex gap-3 text-xs">
                    <span className="text-success">{t('tools.imageConverter.successCount', { count: batchState.successful })}</span>
                    <span className="text-danger">{t('tools.imageConverter.failedCount', { count: batchState.failed })}</span>
                  </div>
                  {batchState.completed === batchState.total && batchState.successful > 0 && (
                    <button onClick={handleDownloadAll} className="px-3 py-1 text-xs bg-accent text-white rounded hover:opacity-90">
                      {t('tools.imageConverter.downloadAll')}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* 右侧：设置和预览 */}
          <div className="flex flex-col min-h-0 gap-3">
            {/* 转换设置 */}
            <div className="p-4 bg-secondary rounded-lg flex-shrink-0 space-y-3">
              {/* 质量滑块 */}
              {shouldShowQualitySlider(options.targetFormat) && (
                <div>
                  <label className="block text-sm text-main mb-1">{t('tools.imageConverter.quality')}: {options.quality}%</label>
                  <input type="range" min="1" max="100" value={options.quality} onChange={(e) => setOptions(prev => ({ ...prev, quality: parseInt(e.target.value, 10) }))} className="w-full accent-accent" />
                </div>
              )}

              {/* ICO 尺寸 */}
              {options.targetFormat === 'ico' && (
                <div>
                  <label className="block text-sm text-main mb-1">{t('tools.imageConverter.icoSize')}</label>
                  <select value={options.icoSize} onChange={(e) => setOptions(prev => ({ ...prev, icoSize: parseInt(e.target.value, 10) }))} className="w-full px-3 py-2 bg-main border border-default rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent">
                    {ICO_SIZES.map(size => <option key={size} value={size}>{size}×{size}</option>)}
                  </select>
                </div>
              )}

              {/* 尺寸调整 */}
              <div>
                <label className="flex items-center gap-2 text-sm text-main">
                  <input type="checkbox" checked={options.resize.enabled} onChange={(e) => setOptions(prev => ({ ...prev, resize: { ...prev.resize, enabled: e.target.checked, width: selectedImage?.width || 0, height: selectedImage?.height || 0 } }))} className="rounded accent-accent" />
                  {t('tools.imageConverter.resize')}
                </label>
                {options.resize.enabled && (
                  <div className="mt-2 pl-6 space-y-2">
                    <div className="flex items-center gap-2">
                      <input type="number" value={options.resize.width || ''} onChange={(e) => handleWidthChange(e.target.value)} placeholder={t('tools.imageConverter.width')} className="w-20 px-2 py-1 bg-main border border-default rounded text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
                      <span className="text-secondary">×</span>
                      <input type="number" value={options.resize.height || ''} onChange={(e) => handleHeightChange(e.target.value)} placeholder={t('tools.imageConverter.height')} className="w-20 px-2 py-1 bg-main border border-default rounded text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
                    </div>
                    <label className="flex items-center gap-2 text-xs text-secondary">
                      <input type="checkbox" checked={options.resize.maintainAspectRatio} onChange={(e) => setOptions(prev => ({ ...prev, resize: { ...prev.resize, maintainAspectRatio: e.target.checked } }))} className="rounded accent-accent" />
                      {t('tools.imageConverter.maintainAspectRatio')}
                    </label>
                  </div>
                )}
              </div>
            </div>

            {/* 预览区域 */}
            <div className="flex-1 border border-default rounded-lg p-4 overflow-auto">
              {selectedImage ? (
                <div className="grid grid-cols-2 gap-4 h-full">
                  <div className="flex flex-col">
                    <p className="text-xs text-secondary mb-2">{t('tools.imageConverter.original')}</p>
                    <div className="flex-1 flex items-center justify-center bg-secondary rounded-lg p-2">
                      <img src={selectedImage.dataUrl} alt="Original" className="max-w-full max-h-full object-contain" />
                    </div>
                    <p className="text-xs text-secondary mt-2 text-center">{selectedImage.width}×{selectedImage.height} · {formatFileSize(selectedImage.size)}</p>
                  </div>
                  <div className="flex flex-col">
                    <p className="text-xs text-secondary mb-2">{t('tools.imageConverter.converted')}</p>
                    <div className="flex-1 flex items-center justify-center bg-secondary rounded-lg p-2">
                      {selectedResult?.dataUrl ? (
                        <img src={selectedResult.dataUrl} alt="Converted" className="max-w-full max-h-full object-contain" />
                      ) : (
                        <span className="text-secondary text-sm">{t('tools.imageConverter.noImages')}</span>
                      )}
                    </div>
                    {selectedResult && (
                      <p className="text-xs text-secondary mt-2 text-center">{selectedResult.newName} · {formatFileSize(selectedResult.size || 0)}</p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center">
                    <span className="material-symbols-outlined text-4xl text-secondary">compare</span>
                    <p className="text-sm text-secondary mt-2">{t('tools.imageConverter.addImages')}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </ToolCard>
  );
}
