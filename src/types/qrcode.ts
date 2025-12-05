/**
 * 二维码生成器类型定义
 */

/** 纠错级别 */
export type ErrorCorrectionLevel = 'L' | 'M' | 'Q' | 'H';

/** 二维码尺寸 */
export type QRCodeSize = 128 | 256 | 384 | 512;

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

/** Session Storage 键 */
export const QRCODE_STORAGE_KEYS = {
  GENERATED_IMAGES: 'qrcode-generated-images',
  SCAN_IMAGES: 'qrcode-scan-images',
} as const;
