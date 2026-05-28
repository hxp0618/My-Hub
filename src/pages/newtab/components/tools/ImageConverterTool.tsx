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
export const DEFAULT_IMAGE_QUALITY = 85;
export const DEFAULT_ICO_SIZE = 32;
export const MAX_RESIZE_DIMENSION = 8192;
const SUPPORTED_INPUT_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/bmp'];
const IMAGE_CONVERTER_ERROR_KEYS = ['loadError', 'convertError'] as const;
type ImageConverterErrorKey = typeof IMAGE_CONVERTER_ERROR_KEYS[number];

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
  return parseResizeDimension(value) > 0;
}

export function parseResizeDimension(value: string | number): number {
  if (typeof value === 'number') {
    if (!Number.isSafeInteger(value) || value <= 0) return 0;
    return Math.min(value, MAX_RESIZE_DIMENSION);
  }

  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) return 0;

  const num = Number(trimmed);
  if (!Number.isSafeInteger(num) || num <= 0) return 0;

  // 避免异常大尺寸触发浏览器 canvas 内存压力。
  return Math.min(num, MAX_RESIZE_DIMENSION);
}

export function parseImageQuality(
  value: string | number,
  fallback = DEFAULT_IMAGE_QUALITY
): number {
  const safeFallback = Number.isSafeInteger(fallback)
    ? Math.min(100, Math.max(1, fallback))
    : DEFAULT_IMAGE_QUALITY;

  const rawValue = typeof value === 'string' ? value.trim() : value;
  if (typeof rawValue === 'string') {
    if (!/^\d+$/.test(rawValue)) return safeFallback;
    const parsedValue = Number(rawValue);
    return Number.isSafeInteger(parsedValue)
      ? Math.min(100, Math.max(1, parsedValue))
      : safeFallback;
  }

  if (!Number.isSafeInteger(rawValue)) return safeFallback;
  return Math.min(100, Math.max(1, rawValue));
}

export function parseIcoSizeOption(
  value: string | number | undefined,
  fallback = DEFAULT_ICO_SIZE
): number {
  const safeFallback = ICO_SIZES.includes(fallback) ? fallback : DEFAULT_ICO_SIZE;
  const rawValue = typeof value === 'string' ? value.trim() : value;

  if (typeof rawValue === 'string') {
    if (!/^\d+$/.test(rawValue)) return safeFallback;
    const parsedValue = Number(rawValue);
    return ICO_SIZES.includes(parsedValue) ? parsedValue : safeFallback;
  }

  return typeof rawValue === 'number' && ICO_SIZES.includes(rawValue)
    ? rawValue
    : safeFallback;
}

export function generateOutputFileName(originalName: string, targetFormat: ImageFormat): string {
  const baseName = originalName.replace(/\.[^/.]+$/, '');
  const safeBaseName = baseName
    .trim()
    .split('')
    .map(char => (char.charCodeAt(0) < 32 || /[\\/:*?"<>|]/.test(char) ? '_' : char))
    .join('')
    .replace(/\s+/g, ' ')
    .replace(/^\.+$/, '');

  return `${safeBaseName || 'converted-image'}${FORMAT_EXTENSION_MAP[targetFormat]}`;
}

export function makeUniqueFileName(fileName: string, usedNames: Set<string>): string {
  const extensionMatch = fileName.match(/(\.[^.]*)$/);
  const extension = extensionMatch?.[1] ?? '';
  const baseName = extension ? fileName.slice(0, -extension.length) : fileName;
  let candidate = fileName;
  let counter = 2;

  while (usedNames.has(candidate.toLowerCase())) {
    candidate = `${baseName}-${counter}${extension}`;
    counter += 1;
  }

  usedNames.add(candidate.toLowerCase());
  return candidate;
}

export function shouldShowQualitySlider(format: ImageFormat): boolean {
  return format === 'jpeg' || format === 'webp';
}

function getImageConverterErrorKey(error: unknown): ImageConverterErrorKey {
  if (
    error instanceof Error &&
    IMAGE_CONVERTER_ERROR_KEYS.includes(error.message as ImageConverterErrorKey)
  ) {
    return error.message as ImageConverterErrorKey;
  }

  return 'convertError';
}

export async function convertImage(imageInfo: ImageInfo, options: ConvertOptions): Promise<ConvertResult> {
  const { targetFormat, resize } = options;
  const quality = parseImageQuality(options.quality);
  const icoSize = parseIcoSizeOption(options.icoSize);
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

    if (targetFormat === 'ico') {
      targetWidth = icoSize;
      targetHeight = icoSize;
    }

    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('convertError');

    if (targetFormat === 'jpeg') {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, targetWidth, targetHeight);
    }
    ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

    const mimeType = FORMAT_MIME_MAP[targetFormat];
    const qualityValue = shouldShowQualitySlider(targetFormat) ? quality / 100 : undefined;

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('convertError'))), mimeType, qualityValue);
    });

    const dataUrl = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });

    return { success: true, originalName: imageInfo.name, newName: generateOutputFileName(imageInfo.name, targetFormat), blob, dataUrl, size: blob.size };
  } catch (error) {
    return {
      success: false,
      originalName: imageInfo.name,
      newName: generateOutputFileName(imageInfo.name, targetFormat),
      error: i18n.t(`tools.imageConverter.${getImageConverterErrorKey(error)}`),
    };
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
  const usedNames = new Set<string>();
  results
    .filter(r => r.success && r.blob)
    .forEach(r => r.blob && zip.file(makeUniqueFileName(r.newName, usedNames), r.blob));
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [images, setImages] = useState<ImageInfo[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [options, setOptions] = useState<ConvertOptions>({
    targetFormat: 'png',
    quality: DEFAULT_IMAGE_QUALITY,
    resize: { enabled: false, width: 0, height: 0, maintainAspectRatio: true },
    icoSize: DEFAULT_ICO_SIZE,
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
    const width = parseResizeDimension(value);
    if (selectedImage && options.resize.maintainAspectRatio) {
      const { height } = width > 0
        ? calculateAspectRatio(selectedImage.width, selectedImage.height, width, undefined, true)
        : { height: 0 };
      setOptions((prev) => ({ ...prev, resize: { ...prev.resize, width, height } }));
    } else {
      setOptions((prev) => ({ ...prev, resize: { ...prev.resize, width } }));
    }
  };

  const handleHeightChange = (value: string) => {
    const height = parseResizeDimension(value);
    if (selectedImage && options.resize.maintainAspectRatio) {
      const { width } = height > 0
        ? calculateAspectRatio(selectedImage.width, selectedImage.height, undefined, height, true)
        : { width: 0 };
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
    setError(result.success ? null : result.error ?? t('tools.imageConverter.convertError'));
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
          <div className="p-3 nb-bg-card nb-border rounded-none flex-shrink-0" style={{ borderColor: 'var(--nb-accent-pink)' }}>
            <p className="text-sm text-[color:var(--color-error-text)]">{error}</p>
          </div>
        )}

        {/* 主内容区 */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-0">
          {/* 左侧：上传和图片列表 */}
          <div className="flex flex-col min-h-0 gap-3">
            {/* 上传区域 */}
            <div
              className="border-2 border-dashed border-[color:var(--nb-border)] rounded-none p-4 text-center cursor-pointer nb-bg-card hover:bg-[color:var(--nb-bg)] transition-colors flex-shrink-0"
              onClick={handleUploadClick}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
            >
              <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileChange} />
              <span className="material-symbols-outlined text-3xl nb-text-secondary">upload</span>
              <p className="text-sm nb-text mt-1">{t('tools.imageConverter.uploadHint')}</p>
              <p className="text-xs nb-text-secondary">{t('tools.imageConverter.supportedFormats')}</p>
            </div>

            {/* 图片列表 */}
            {images.length > 0 ? (
              <div className="flex-1 overflow-y-auto nb-border rounded-none">
                {images.map((image, index) => {
                  const result = results.get(image.id);
                  return (
                    <div
                      key={image.id}
                      className={`flex items-center gap-3 p-3 cursor-pointer transition-colors border-b border-[color:var(--nb-border)] last:border-b-0 ${
                        selectedIndex === index ? 'nb-selected' : 'hover:bg-[color:var(--nb-bg)]'
                      }`}
                      onClick={() => setSelectedIndex(index)}
                    >
                      <img src={image.dataUrl} alt={image.name} className="w-10 h-10 object-cover rounded-none nb-border" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm nb-text truncate">{image.name}</p>
                        <p className="text-xs nb-text-secondary">{image.width}×{image.height} · {formatFileSize(image.size)}</p>
                      </div>
                      {result && (
                        <span className={`text-sm ${result.success ? 'text-[color:var(--nb-accent-green)]' : 'text-[color:var(--color-error-text)]'}`}>
                          {result.success ? '✓' : '✗'}
                        </span>
                      )}
                      <button onClick={(e) => { e.stopPropagation(); handleRemoveImage(index); }} className="p-1 rounded-none hover:bg-[color:var(--nb-bg)]">
                        <span className="material-symbols-outlined text-sm nb-text-secondary">close</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center nb-border rounded-none nb-bg-card">
                <div className="text-center">
                  <span className="material-symbols-outlined text-4xl nb-text-secondary">image</span>
                  <p className="text-sm nb-text-secondary mt-2">{t('tools.imageConverter.noImages')}</p>
                </div>
              </div>
            )}

            {/* 批量进度 */}
            {batchState && (
              <div className="nb-card-static p-3 flex-shrink-0">
                <div className="flex justify-between text-sm mb-2">
                  <span className="nb-text">{t('tools.imageConverter.batchProgress')}</span>
                  <span className="nb-text-secondary">{batchState.completed}/{batchState.total}</span>
                </div>
                <div className="w-full h-2 nb-border rounded-full overflow-hidden bg-[color:var(--nb-card)]">
                  <div className="h-full bg-[color:var(--nb-accent-blue)] transition-all" style={{ width: `${(batchState.completed / batchState.total) * 100}%` }} />
                </div>
                <div className="flex justify-between items-center mt-2">
                  <div className="flex gap-3 text-xs">
                    <span className="text-[color:var(--nb-accent-green)]">{t('tools.imageConverter.successCount', { count: batchState.successful })}</span>
                    <span className="text-[color:var(--color-error-text)]">{t('tools.imageConverter.failedCount', { count: batchState.failed })}</span>
                  </div>
                  {batchState.completed === batchState.total && batchState.successful > 0 && (
                    <button onClick={handleDownloadAll} className="nb-btn nb-btn-primary text-xs px-3 py-1">
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
            <div className="nb-card-static p-4 flex-shrink-0 space-y-3">
              {/* 质量滑块 */}
              {shouldShowQualitySlider(options.targetFormat) && (
                <div>
                  <label className="block text-sm nb-text mb-1">{t('tools.imageConverter.quality')}: {options.quality}%</label>
                  <input type="range" min="1" max="100" value={options.quality} onChange={(e) => setOptions(prev => ({ ...prev, quality: parseImageQuality(e.target.value, prev.quality) }))} className="w-full accent-[color:var(--nb-border)]" />
                </div>
              )}

              {/* ICO 尺寸 */}
              {options.targetFormat === 'ico' && (
                <div>
                  <label className="block text-sm nb-text mb-1">{t('tools.imageConverter.icoSize')}</label>
                  <select value={options.icoSize} onChange={(e) => setOptions(prev => ({ ...prev, icoSize: parseIcoSizeOption(e.target.value, prev.icoSize) }))} className="nb-input w-full text-sm">
                    {ICO_SIZES.map(size => <option key={size} value={size}>{size}×{size}</option>)}
                  </select>
                </div>
              )}

              {/* 尺寸调整 */}
              <div>
                <label className="flex items-center gap-2 text-sm nb-text">
                  <input type="checkbox" checked={options.resize.enabled} onChange={(e) => setOptions(prev => ({ ...prev, resize: { ...prev.resize, enabled: e.target.checked, width: selectedImage?.width || 0, height: selectedImage?.height || 0 } }))} className="h-4 w-4 border-2 border-[color:var(--nb-border)] rounded-sm accent-[color:var(--nb-border)]" />
                  {t('tools.imageConverter.resize')}
                </label>
                {options.resize.enabled && (
                  <div className="mt-2 pl-6 space-y-2">
                    <div className="flex items-center gap-2">
                      <input type="number" value={options.resize.width || ''} onChange={(e) => handleWidthChange(e.target.value)} placeholder={t('tools.imageConverter.width')} className="nb-input w-20 text-sm py-1 px-2" />
                      <span className="nb-text-secondary">×</span>
                      <input type="number" value={options.resize.height || ''} onChange={(e) => handleHeightChange(e.target.value)} placeholder={t('tools.imageConverter.height')} className="nb-input w-20 text-sm py-1 px-2" />
                    </div>
                    <label className="flex items-center gap-2 text-xs nb-text-secondary">
                      <input type="checkbox" checked={options.resize.maintainAspectRatio} onChange={(e) => setOptions(prev => ({ ...prev, resize: { ...prev.resize, maintainAspectRatio: e.target.checked } }))} className="h-4 w-4 border-2 border-[color:var(--nb-border)] rounded-sm accent-[color:var(--nb-border)]" />
                      {t('tools.imageConverter.maintainAspectRatio')}
                    </label>
                  </div>
                )}
              </div>
            </div>

            {/* 预览区域 */}
            <div className="flex-1 nb-border rounded-none p-4 overflow-auto nb-bg-card">
              {selectedImage ? (
                <div className="grid grid-cols-2 gap-4 h-full">
                  <div className="flex flex-col">
                    <p className="text-xs nb-text-secondary mb-2">{t('tools.imageConverter.original')}</p>
                    <div className="flex-1 flex items-center justify-center nb-bg-card nb-border rounded-none p-2">
                      <img src={selectedImage.dataUrl} alt="Original" className="max-w-full max-h-full object-contain" />
                    </div>
                    <p className="text-xs nb-text-secondary mt-2 text-center">{selectedImage.width}×{selectedImage.height} · {formatFileSize(selectedImage.size)}</p>
                  </div>
                  <div className="flex flex-col">
                    <p className="text-xs nb-text-secondary mb-2">{t('tools.imageConverter.converted')}</p>
                    <div className="flex-1 flex items-center justify-center nb-bg-card nb-border rounded-none p-2">
                      {selectedResult?.dataUrl ? (
                        <img src={selectedResult.dataUrl} alt="Converted" className="max-w-full max-h-full object-contain" />
                      ) : (
                        <span className="nb-text-secondary text-sm">{t('tools.imageConverter.noImages')}</span>
                      )}
                    </div>
                    {selectedResult && (
                      <p className="text-xs nb-text-secondary mt-2 text-center">{selectedResult.newName} · {formatFileSize(selectedResult.size || 0)}</p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center">
                    <span className="material-symbols-outlined text-4xl nb-text-secondary">compare</span>
                    <p className="text-sm nb-text-secondary mt-2">{t('tools.imageConverter.addImages')}</p>
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
