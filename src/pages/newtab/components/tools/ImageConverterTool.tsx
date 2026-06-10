/**
 * 图片格式转换工具
 * 支持 PNG、JPEG、WebP、GIF、BMP、ICO 格式之间的转换
 */
import { useState, useRef, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import JSZip from 'jszip';
import i18n from '../../../../i18n';
import { ToolCard } from '../../../../components/ToolCard';
import { Modal } from '../../../../components/Modal';
import { TOOL_METADATA, ToolId, ToolComponentProps } from '../../../../types/tools';
import { useCopyToClipboard } from '../../../../hooks/useCopyToClipboard';

// ==================== 类型定义 ====================

/** 支持的图片格式 */
export type ImageFormat = 'png' | 'jpeg' | 'webp' | 'gif' | 'bmp' | 'ico';
export type ImageConverterMode = 'format' | 'imageToBase64' | 'base64ToImage';
export type ImageBase64OutputMode = 'dataUrl' | 'rawBase64';

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

/** Base64 图片解析结果 */
export interface ImageBase64Result {
  dataUrl: string;
  rawBase64: string;
  mimeType: string;
  extension: string;
  blob: Blob;
  size: number;
  fileName: string;
}

interface ImagePreviewState {
  dataUrl: string;
  title: string;
  detail: string;
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
const IMAGE_BASE64_ERROR_KEYS = ['emptyBase64Input', 'invalidImageBase64'] as const;
type ImageBase64ErrorKey = typeof IMAGE_BASE64_ERROR_KEYS[number];
const IMAGE_MIME_EXTENSION_MAP: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/bmp': 'bmp',
  'image/x-icon': 'ico',
  'image/vnd.microsoft.icon': 'ico',
  'image/svg+xml': 'svg',
  'image/avif': 'avif',
};
const IMAGE_CONVERTER_MODES: Array<{ id: ImageConverterMode; icon: string; labelKey: string }> = [
  { id: 'format', icon: 'compare_arrows', labelKey: 'modeFormat' },
  { id: 'imageToBase64', icon: 'data_object', labelKey: 'modeImageToBase64' },
  { id: 'base64ToImage', icon: 'image', labelKey: 'modeBase64ToImage' },
];

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

export function extractImageDataUrlParts(dataUrl: string): { mimeType: string; rawBase64: string } | null {
  const match = dataUrl.trim().match(/^data:([^;,]+)(?:;[^,]*)*;base64,([\s\S]*)$/i);
  if (!match) return null;

  const mimeType = match[1].toLowerCase();
  if (!mimeType.startsWith('image/')) return null;

  return {
    mimeType,
    rawBase64: normalizeBase64Payload(match[2]),
  };
}

export function normalizeBase64Payload(payload: string): string {
  const normalized = payload
    .replace(/\s/g, '')
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  if (!normalized) return '';

  return normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
}

export function detectImageMimeType(bytes: Uint8Array): string | null {
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return 'image/png';
  }

  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'image/jpeg';
  }

  if (
    bytes.length >= 6 &&
    bytes[0] === 0x47 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x38 &&
    (bytes[4] === 0x37 || bytes[4] === 0x39) &&
    bytes[5] === 0x61
  ) {
    return 'image/gif';
  }

  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return 'image/webp';
  }

  if (bytes.length >= 2 && bytes[0] === 0x42 && bytes[1] === 0x4d) {
    return 'image/bmp';
  }

  if (
    bytes.length >= 4 &&
    bytes[0] === 0x00 &&
    bytes[1] === 0x00 &&
    bytes[2] === 0x01 &&
    bytes[3] === 0x00
  ) {
    return 'image/x-icon';
  }

  if (
    bytes.length >= 12 &&
    bytes[4] === 0x66 &&
    bytes[5] === 0x74 &&
    bytes[6] === 0x79 &&
    bytes[7] === 0x70 &&
    bytes[8] === 0x61 &&
    bytes[9] === 0x76 &&
    bytes[10] === 0x69 &&
    (bytes[11] === 0x66 || bytes[11] === 0x73)
  ) {
    return 'image/avif';
  }

  const textSnippet = new TextDecoder('utf-8', { fatal: false })
    .decode(bytes.slice(0, 512))
    .replace(/^\uFEFF/, '')
    .trimStart()
    .toLowerCase();
  if (textSnippet.startsWith('<svg') || (textSnippet.startsWith('<?xml') && textSnippet.includes('<svg'))) {
    return 'image/svg+xml';
  }

  return null;
}

export function getImageExtensionFromMimeType(mimeType: string): string {
  const normalizedMimeType = mimeType.toLowerCase();
  const mappedExtension = IMAGE_MIME_EXTENSION_MAP[normalizedMimeType];
  if (mappedExtension) return mappedExtension;

  const subtype = normalizedMimeType.split('/')[1]?.split('+')[0];
  return subtype?.replace(/[^a-z0-9]/g, '') || 'png';
}

export function createImageBase64Result(input: string): ImageBase64Result {
  const trimmed = input.trim();
  if (!trimmed) throw new Error('emptyBase64Input');

  const dataUrlParts = extractImageDataUrlParts(trimmed);
  const explicitMimeType = dataUrlParts?.mimeType;
  const rawBase64 = dataUrlParts?.rawBase64 ?? normalizeBase64Payload(trimmed);
  const unpaddedBase64 = rawBase64.replace(/=+$/g, '');
  const padding = rawBase64.slice(unpaddedBase64.length);

  if (
    !unpaddedBase64 ||
    padding.length > 2 ||
    !/^[A-Za-z0-9+/]+$/.test(unpaddedBase64) ||
    !/^={0,2}$/.test(padding)
  ) {
    throw new Error('invalidImageBase64');
  }

  let bytes: Uint8Array;
  try {
    const binary = atob(rawBase64);
    if (!binary) throw new Error('invalidImageBase64');
    bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
  } catch {
    throw new Error('invalidImageBase64');
  }

  const detectedMimeType = detectImageMimeType(bytes);
  const mimeType = explicitMimeType ?? detectedMimeType;
  if (!mimeType?.startsWith('image/')) {
    throw new Error('invalidImageBase64');
  }

  const extension = getImageExtensionFromMimeType(mimeType);
  const imageBuffer = bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;
  const blob = new Blob([imageBuffer], { type: mimeType });
  return {
    dataUrl: `data:${mimeType};base64,${rawBase64}`,
    rawBase64,
    mimeType,
    extension,
    blob,
    size: blob.size,
    fileName: `base64-image.${extension}`,
  };
}

export function verifyImageDataUrl(dataUrl: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('invalidImageBase64'));
    img.src = dataUrl;
  });
}

export function getImageBase64ErrorKey(error: unknown): ImageBase64ErrorKey {
  if (
    error instanceof Error &&
    IMAGE_BASE64_ERROR_KEYS.includes(error.message as ImageBase64ErrorKey)
  ) {
    return error.message as ImageBase64ErrorKey;
  }

  return 'invalidImageBase64';
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

interface ZoomableImageButtonProps {
  src: string;
  alt: string;
  ariaLabel: string;
  onClick: () => void;
}

function ZoomableImageButton({ src, alt, ariaLabel, onClick }: ZoomableImageButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative flex h-full w-full cursor-zoom-in items-center justify-center overflow-hidden rounded-[var(--nb-border-radius-md)] nb-bg-card nb-border p-2"
      aria-label={ariaLabel}
      title={ariaLabel}
    >
      <img src={src} alt={alt} className="max-w-full max-h-full object-contain" />
      <span className="absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-[var(--nb-border-radius-sm)] border-2 border-[color:var(--nb-border)] bg-[color:var(--nb-accent-yellow)] text-[color:var(--nb-text-on-accent)] shadow-[var(--nb-shadow-sm)]" aria-hidden="true">
        <span className="material-symbols-outlined text-xl">zoom_in</span>
      </span>
    </button>
  );
}


// ==================== 组件 ====================

export default function ImageConverterTool({ isExpanded, onToggleExpand }: ToolComponentProps) {
  const { t } = useTranslation();
  const { copy } = useCopyToClipboard();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const base64FileInputRef = useRef<HTMLInputElement>(null);

  const [mode, setMode] = useState<ImageConverterMode>('format');
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
  const [base64SourceImage, setBase64SourceImage] = useState<ImageInfo | null>(null);
  const [base64OutputMode, setBase64OutputMode] = useState<ImageBase64OutputMode>('dataUrl');
  const [base64Input, setBase64Input] = useState('');
  const [base64Result, setBase64Result] = useState<ImageBase64Result | null>(null);
  const [isDecodingBase64, setIsDecodingBase64] = useState(false);
  const [previewImage, setPreviewImage] = useState<ImagePreviewState | null>(null);

  const selectedImage = images[selectedIndex];
  const selectedResult = selectedImage ? results.get(selectedImage.id) : undefined;
  const formats: ImageFormat[] = ['png', 'jpeg', 'webp', 'gif', 'bmp', 'ico'];
  const base64Output = useMemo(() => {
    if (!base64SourceImage) return '';
    if (base64OutputMode === 'dataUrl') return base64SourceImage.dataUrl;
    return extractImageDataUrlParts(base64SourceImage.dataUrl)?.rawBase64 ?? '';
  }, [base64OutputMode, base64SourceImage]);

  const handleModeChange = (nextMode: ImageConverterMode) => {
    setMode(nextMode);
    setError(null);
  };

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

  const handleBase64ImageFiles = useCallback(async (files: FileList | File[]) => {
    const file = Array.from(files)[0];
    if (!file) return;

    const validation = validateImageFile(file);
    if (!validation.valid) {
      setError(t(`tools.imageConverter.${validation.error}`));
      return;
    }

    try {
      const imageInfo = await loadImage(file);
      setBase64SourceImage(imageInfo);
      setError(null);
    } catch {
      setError(t('tools.imageConverter.loadError'));
    }
  }, [t]);

  const handleBase64Drop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    handleBase64ImageFiles(e.dataTransfer.files);
  }, [handleBase64ImageFiles]);

  const handleBase64FileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) handleBase64ImageFiles(e.target.files);
  };

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

  const handleCopyBase64Output = async () => {
    await copy(base64Output, t('tools.imageConverter.base64CopySuccess'));
  };

  const handleClearImageToBase64 = () => {
    setBase64SourceImage(null);
    setError(null);
    if (base64FileInputRef.current) {
      base64FileInputRef.current.value = '';
    }
  };

  const handleDecodeBase64ToImage = async () => {
    setIsDecodingBase64(true);
    try {
      const result = createImageBase64Result(base64Input);
      await verifyImageDataUrl(result.dataUrl);
      setBase64Result(result);
      setError(null);
    } catch (decodeError) {
      setBase64Result(null);
      setError(t(`tools.imageConverter.${getImageBase64ErrorKey(decodeError)}`));
    } finally {
      setIsDecodingBase64(false);
    }
  };

  const handleDownloadBase64Image = () => {
    if (!base64Result) return;
    const url = URL.createObjectURL(base64Result.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = base64Result.fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleClearBase64ToImage = () => {
    setBase64Input('');
    setBase64Result(null);
    setError(null);
  };

  const openImagePreview = useCallback((preview: ImagePreviewState) => {
    setPreviewImage(preview);
  }, []);

  const closeImagePreview = useCallback(() => {
    setPreviewImage(null);
  }, []);

  return (
    <ToolCard tool={TOOL_METADATA[ToolId.IMAGE_CONVERTER]} isExpanded={isExpanded} onToggleExpand={onToggleExpand}>
      <div className="h-full flex flex-col gap-4">
        {/* 模式切换 */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 flex-shrink-0" role="tablist" aria-label={t('tools.imageConverter.modeLabel')}>
          {IMAGE_CONVERTER_MODES.map(item => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={mode === item.id}
              onClick={() => handleModeChange(item.id)}
              className={`nb-btn text-sm justify-start gap-2 ${mode === item.id ? 'nb-btn-primary' : 'nb-btn-secondary'}`}
            >
              <span className="material-symbols-outlined text-lg" aria-hidden="true">{item.icon}</span>
              <span className="truncate">{t(`tools.imageConverter.${item.labelKey}`)}</span>
            </button>
          ))}
        </div>

        {/* 操作按钮 */}
        <div className="flex items-center justify-between flex-shrink-0 flex-wrap gap-2">
          {mode === 'format' && (
            <>
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
            </>
          )}

          {mode === 'imageToBase64' && (
            <>
              <div className="flex gap-2 flex-wrap">
                <button onClick={() => base64FileInputRef.current?.click()} className="nb-btn nb-btn-primary text-sm">
                  <span className="material-symbols-outlined text-lg" aria-hidden="true">upload</span>
                  {t('tools.imageConverter.selectImage')}
                </button>
                <button onClick={handleCopyBase64Output} disabled={!base64Output} className="nb-btn nb-btn-secondary text-sm">
                  <span className="material-symbols-outlined text-lg" aria-hidden="true">content_copy</span>
                  {t('tools.imageConverter.copy')}
                </button>
                {base64SourceImage && (
                  <button onClick={handleClearImageToBase64} className="nb-btn nb-btn-ghost text-sm">
                    {t('tools.imageConverter.clear')}
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm nb-text-secondary">{t('tools.imageConverter.outputType')}:</label>
                <select value={base64OutputMode} onChange={e => setBase64OutputMode(e.target.value as ImageBase64OutputMode)} className="nb-input text-sm">
                  <option value="dataUrl">{t('tools.imageConverter.dataUrlOutput')}</option>
                  <option value="rawBase64">{t('tools.imageConverter.rawBase64Output')}</option>
                </select>
              </div>
            </>
          )}

          {mode === 'base64ToImage' && (
            <div className="flex gap-2 flex-wrap">
              <button onClick={handleDecodeBase64ToImage} disabled={isDecodingBase64} className="nb-btn nb-btn-primary text-sm">
                <span className="material-symbols-outlined text-lg" aria-hidden="true">image</span>
                {isDecodingBase64 ? t('tools.imageConverter.decoding') : t('tools.imageConverter.decodeImage')}
              </button>
              {base64Result && (
                <button onClick={handleDownloadBase64Image} className="nb-btn nb-btn-secondary text-sm">
                  <span className="material-symbols-outlined text-lg" aria-hidden="true">download</span>
                  {t('tools.imageConverter.download')}
                </button>
              )}
              <button onClick={handleClearBase64ToImage} className="nb-btn nb-btn-ghost text-sm">
                {t('tools.imageConverter.clear')}
              </button>
            </div>
          )}
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="p-3 nb-bg-card nb-border rounded-md flex-shrink-0" style={{ borderColor: 'var(--nb-accent-pink)' }}>
            <p className="text-sm text-[color:var(--color-error-text)]">{error}</p>
          </div>
        )}

        {/* 主内容区 */}
        {mode === 'format' && (
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-0">
          {/* 左侧：上传和图片列表 */}
          <div className="flex flex-col min-h-0 gap-3">
            {/* 上传区域 */}
            <div
              className="border-2 border-dashed border-[color:var(--nb-border)] rounded-md p-4 text-center cursor-pointer nb-bg-card hover:bg-[color:var(--nb-bg)] transition-colors flex-shrink-0"
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
              <div className="flex-1 overflow-y-auto nb-border rounded-md">
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
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleRemoveImage(index); }}
                        className="flex h-11 w-11 items-center justify-center rounded-[var(--nb-border-radius-sm)] hover:bg-[color:var(--nb-bg)]"
                        aria-label={t('common.delete')}
                      >
                        <span className="material-symbols-outlined text-sm nb-text-secondary" aria-hidden="true">close</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center nb-border rounded-md nb-bg-card">
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
            <div className="flex-1 nb-border rounded-md p-4 overflow-auto nb-bg-card">
              {selectedImage ? (
                <div className="grid grid-cols-2 gap-4 h-full">
                  <div className="flex flex-col">
                    <p className="text-xs nb-text-secondary mb-2">{t('tools.imageConverter.original')}</p>
                    <div className="flex-1 min-h-0">
                      <ZoomableImageButton
                        src={selectedImage.dataUrl}
                        alt={selectedImage.name}
                        ariaLabel={t('tools.imageConverter.previewAriaLabel', { name: selectedImage.name })}
                        onClick={() => openImagePreview({
                          dataUrl: selectedImage.dataUrl,
                          title: t('tools.imageConverter.originalPreviewTitle', { name: selectedImage.name }),
                          detail: `${selectedImage.width}×${selectedImage.height} · ${formatFileSize(selectedImage.size)}`,
                        })}
                      />
                    </div>
                    <p className="text-xs nb-text-secondary mt-2 text-center">{selectedImage.width}×{selectedImage.height} · {formatFileSize(selectedImage.size)}</p>
                  </div>
                  <div className="flex flex-col">
                    <p className="text-xs nb-text-secondary mb-2">{t('tools.imageConverter.converted')}</p>
                    {selectedResult?.dataUrl ? (
                      <div className="flex-1 min-h-0">
                        <ZoomableImageButton
                          src={selectedResult.dataUrl}
                          alt={selectedResult.newName}
                          ariaLabel={t('tools.imageConverter.previewAriaLabel', { name: selectedResult.newName })}
                          onClick={() => openImagePreview({
                            dataUrl: selectedResult.dataUrl ?? '',
                            title: t('tools.imageConverter.convertedPreviewTitle', { name: selectedResult.newName }),
                            detail: `${selectedResult.newName} · ${formatFileSize(selectedResult.size || 0)}`,
                          })}
                        />
                      </div>
                    ) : (
                      <div className="flex-1 flex items-center justify-center nb-bg-card nb-border rounded-md p-2">
                        <span className="nb-text-secondary text-sm">{t('tools.imageConverter.noImages')}</span>
                      </div>
                    )}
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
        )}

        {mode === 'imageToBase64' && (
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-0">
            <div className="flex flex-col min-h-0 gap-3">
              <input ref={base64FileInputRef} type="file" accept="image/*" className="hidden" onChange={handleBase64FileChange} />
              <button
                type="button"
                className="border-2 border-dashed border-[color:var(--nb-border)] rounded-md p-4 text-center cursor-pointer nb-bg-card hover:bg-[color:var(--nb-bg)] transition-colors flex-shrink-0"
                onClick={() => base64FileInputRef.current?.click()}
                onDrop={handleBase64Drop}
                onDragOver={handleDragOver}
              >
                <span className="material-symbols-outlined text-3xl nb-text-secondary" aria-hidden="true">upload</span>
                <p className="text-sm nb-text mt-1">{t('tools.imageConverter.uploadHint')}</p>
                <p className="text-xs nb-text-secondary">{t('tools.imageConverter.supportedFormats')}</p>
              </button>

              <div className="flex-1 nb-border rounded-md p-4 overflow-auto nb-bg-card">
                {base64SourceImage ? (
                  <div className="h-full flex flex-col gap-3">
                    <div className="flex-1 min-h-48">
                      <ZoomableImageButton
                        src={base64SourceImage.dataUrl}
                        alt={base64SourceImage.name}
                        ariaLabel={t('tools.imageConverter.previewAriaLabel', { name: base64SourceImage.name })}
                        onClick={() => openImagePreview({
                          dataUrl: base64SourceImage.dataUrl,
                          title: t('tools.imageConverter.originalPreviewTitle', { name: base64SourceImage.name }),
                          detail: `${base64SourceImage.width}×${base64SourceImage.height} · ${formatFileSize(base64SourceImage.size)}`,
                        })}
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <div className="nb-border rounded-md p-2">
                        <p className="nb-text-secondary">{t('tools.imageConverter.fileName')}</p>
                        <p className="nb-text truncate" title={base64SourceImage.name}>{base64SourceImage.name}</p>
                      </div>
                      <div className="nb-border rounded-md p-2">
                        <p className="nb-text-secondary">{t('tools.imageConverter.dimensions')}</p>
                        <p className="nb-text">{base64SourceImage.width}×{base64SourceImage.height}</p>
                      </div>
                      <div className="nb-border rounded-md p-2">
                        <p className="nb-text-secondary">{t('tools.imageConverter.format')}</p>
                        <p className="nb-text">{base64SourceImage.originalFormat.toUpperCase()}</p>
                      </div>
                      <div className="nb-border rounded-md p-2">
                        <p className="nb-text-secondary">{t('tools.imageConverter.fileSize')}</p>
                        <p className="nb-text">{formatFileSize(base64SourceImage.size)}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center">
                    <div className="text-center">
                      <span className="material-symbols-outlined text-4xl nb-text-secondary" aria-hidden="true">data_object</span>
                      <p className="text-sm nb-text-secondary mt-2">{t('tools.imageConverter.selectImage')}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col min-h-0">
              <label className="block text-sm font-medium nb-text mb-2 flex-shrink-0">
                {t('tools.imageConverter.base64Output')}
              </label>
              <textarea
                value={base64Output}
                readOnly
                placeholder={t('tools.imageConverter.imageToBase64Placeholder')}
                className="nb-input flex-1 font-mono text-xs resize-none"
              />
            </div>
          </div>
        )}

        {mode === 'base64ToImage' && (
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-0">
            <div className="flex flex-col min-h-0">
              <label className="block text-sm font-medium nb-text mb-2 flex-shrink-0">
                {t('tools.imageConverter.base64Input')}
              </label>
              <textarea
                value={base64Input}
                onChange={e => {
                  setBase64Input(e.target.value);
                  setBase64Result(null);
                  setError(null);
                }}
                placeholder={t('tools.imageConverter.base64InputPlaceholder')}
                className="nb-input flex-1 font-mono text-xs resize-none"
              />
            </div>

            <div className="flex flex-col min-h-0 gap-3">
              <div className="flex-1 nb-border rounded-md p-4 overflow-auto nb-bg-card">
                {base64Result ? (
                  <div className="h-full flex flex-col gap-3">
                    <div className="flex-1 min-h-48">
                      <ZoomableImageButton
                        src={base64Result.dataUrl}
                        alt={base64Result.fileName}
                        ariaLabel={t('tools.imageConverter.previewAriaLabel', { name: base64Result.fileName })}
                        onClick={() => openImagePreview({
                          dataUrl: base64Result.dataUrl,
                          title: t('tools.imageConverter.decodedPreviewTitle', { name: base64Result.fileName }),
                          detail: `${base64Result.mimeType} · ${formatFileSize(base64Result.size)}`,
                        })}
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <div className="nb-border rounded-md p-2">
                        <p className="nb-text-secondary">{t('tools.imageConverter.fileName')}</p>
                        <p className="nb-text truncate" title={base64Result.fileName}>{base64Result.fileName}</p>
                      </div>
                      <div className="nb-border rounded-md p-2">
                        <p className="nb-text-secondary">{t('tools.imageConverter.mimeType')}</p>
                        <p className="nb-text truncate" title={base64Result.mimeType}>{base64Result.mimeType}</p>
                      </div>
                      <div className="nb-border rounded-md p-2">
                        <p className="nb-text-secondary">{t('tools.imageConverter.format')}</p>
                        <p className="nb-text">{base64Result.extension.toUpperCase()}</p>
                      </div>
                      <div className="nb-border rounded-md p-2">
                        <p className="nb-text-secondary">{t('tools.imageConverter.fileSize')}</p>
                        <p className="nb-text">{formatFileSize(base64Result.size)}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center">
                    <div className="text-center">
                      <span className="material-symbols-outlined text-4xl nb-text-secondary" aria-hidden="true">image</span>
                      <p className="text-sm nb-text-secondary mt-2">{t('tools.imageConverter.decodedImageEmpty')}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
      <Modal
        isOpen={Boolean(previewImage)}
        onClose={closeImagePreview}
        title={previewImage?.title ?? t('tools.imageConverter.imagePreview')}
        widthClass="max-w-5xl"
      >
        {previewImage && (
          <div className="flex flex-col gap-3">
            <div className="flex h-[min(70dvh,720px)] items-center justify-center overflow-auto rounded-[var(--nb-border-radius-md)] nb-bg-card nb-border p-3">
              <img
                src={previewImage.dataUrl}
                alt={previewImage.title}
                className="max-h-full max-w-full object-contain"
              />
            </div>
            <p className="text-center text-sm nb-text-secondary break-all">
              {previewImage.detail}
            </p>
          </div>
        )}
      </Modal>
    </ToolCard>
  );
}
