/**
 * 二维码生成器类型定义
 */

/** 纠错级别 */
export type ErrorCorrectionLevel = 'L' | 'M' | 'Q' | 'H';

/** 二维码尺寸 */
export type QRCodeSize = 128 | 256 | 384 | 512;

/** 支持的二维码尺寸 */
export const QR_CODE_SIZES: readonly QRCodeSize[] = [128, 256, 384, 512] as const;

/** 支持的二维码边距范围 */
export const QR_CODE_MARGIN_RANGE = {
  min: 0,
  max: 10,
} as const;

/** 二维码配置选项 */
export interface QRCodeOptions {
  size: QRCodeSize;
  margin: number; // 0-10
  errorCorrectionLevel: ErrorCorrectionLevel;
  foregroundColor: string; // HEX 颜色
  backgroundColor: string; // HEX 颜色
}

/** 生成的二维码图片 */
export interface QRCodeImage {
  id: string;
  content: string;
  dataUrl: string;
  options: QRCodeOptions;
  createdAt: number;
  selected: boolean;
}

/** 识别的图片 */
export interface ScanImage {
  id: string;
  originalDataUrl: string;
  decodedContent: string | null;
  createdAt: number;
}

/** 默认配置 */
export const DEFAULT_QRCODE_OPTIONS: QRCodeOptions = {
  size: 256,
  margin: 2,
  errorCorrectionLevel: 'M',
  foregroundColor: '#000000',
  backgroundColor: '#ffffff',
};

const ERROR_CORRECTION_LEVELS: readonly ErrorCorrectionLevel[] = ['L', 'M', 'Q', 'H'] as const;

const isRecord = (value: unknown): value is Record<string, unknown> => (
  !!value && typeof value === 'object' && !Array.isArray(value)
);

const parseStrictInteger = (value: unknown): number | null => {
  if (typeof value === 'number') {
    return Number.isSafeInteger(value) ? value : null;
  }

  if (typeof value !== 'string') {
    return null;
  }

  const trimmedValue = value.trim();
  if (!/^\d+$/.test(trimmedValue)) {
    return null;
  }

  const parsedValue = Number(trimmedValue);
  return Number.isSafeInteger(parsedValue) ? parsedValue : null;
};

export function parseQRCodeSize(
  value: unknown,
  fallback: QRCodeSize = DEFAULT_QRCODE_OPTIONS.size
): QRCodeSize {
  const parsedValue = parseStrictInteger(value);
  if (QR_CODE_SIZES.includes(parsedValue as QRCodeSize)) {
    return parsedValue as QRCodeSize;
  }

  return QR_CODE_SIZES.includes(fallback) ? fallback : DEFAULT_QRCODE_OPTIONS.size;
}

export function parseQRCodeMargin(
  value: unknown,
  fallback: number = DEFAULT_QRCODE_OPTIONS.margin
): number {
  const safeFallback = Number.isSafeInteger(fallback)
    ? Math.min(QR_CODE_MARGIN_RANGE.max, Math.max(QR_CODE_MARGIN_RANGE.min, fallback))
    : DEFAULT_QRCODE_OPTIONS.margin;
  const parsedValue = parseStrictInteger(value);

  if (parsedValue === null) {
    return safeFallback;
  }

  return Math.min(QR_CODE_MARGIN_RANGE.max, Math.max(QR_CODE_MARGIN_RANGE.min, parsedValue));
}

export function sanitizeQRCodeOptions(value: unknown): QRCodeOptions {
  if (!isRecord(value)) return DEFAULT_QRCODE_OPTIONS;

  return {
    size: parseQRCodeSize(value.size, DEFAULT_QRCODE_OPTIONS.size),
    margin: parseQRCodeMargin(value.margin, DEFAULT_QRCODE_OPTIONS.margin),
    errorCorrectionLevel: ERROR_CORRECTION_LEVELS.includes(value.errorCorrectionLevel as ErrorCorrectionLevel)
      ? value.errorCorrectionLevel as ErrorCorrectionLevel
      : DEFAULT_QRCODE_OPTIONS.errorCorrectionLevel,
    foregroundColor: typeof value.foregroundColor === 'string'
      ? value.foregroundColor
      : DEFAULT_QRCODE_OPTIONS.foregroundColor,
    backgroundColor: typeof value.backgroundColor === 'string'
      ? value.backgroundColor
      : DEFAULT_QRCODE_OPTIONS.backgroundColor,
  };
}

/** Session Storage 键 */
export const QRCODE_STORAGE_KEYS = {
  GENERATED_IMAGES: 'qrcode-generated-images',
  SCAN_IMAGES: 'qrcode-scan-images',
} as const;
