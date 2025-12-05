/**
 * SVG 工具类型定义
 */

/** 导出格式 */
export type ExportFormat = 'png' | 'jpeg' | 'webp';

/** 导出选项 */
export interface ExportOptions {
  format: ExportFormat;
  width: number;
  height: number;
  quality: number; // 1-100，仅 JPEG/WebP 有效
  maintainAspectRatio: boolean;
}

/** 转换结果 */
export interface ConvertResult {
  success: boolean;
  dataUrl?: string;
  blob?: Blob;
  width?: number;
  height?: number;
  error?: string;
}

/** SVG 信息 */
export interface SVGInfo {
  width: number;
  height: number;
  viewBox?: string;
  isValid: boolean;
}

/** 预设尺寸 */
export interface PresetSize {
  label: string;
  width: number;
  height: number;
}

/** 默认导出选项 */
export const DEFAULT_EXPORT_OPTIONS: ExportOptions = {
  format: 'png',
  width: 512,
  height: 512,
  quality: 90,
  maintainAspectRatio: true,
};

/** 预设尺寸列表 */
export const PRESET_SIZES: PresetSize[] = [
  { label: '16×16', width: 16, height: 16 },
  { label: '32×32', width: 32, height: 32 },
  { label: '64×64', width: 64, height: 64 },
  { label: '128×128', width: 128, height: 128 },
  { label: '256×256', width: 256, height: 256 },
  { label: '512×512', width: 512, height: 512 },
  { label: '1024×1024', width: 1024, height: 1024 },
];

/** 格式 MIME 类型映射 */
export const FORMAT_MIME_MAP: Record<ExportFormat, string> = {
  png: 'image/png',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
};

/** 格式扩展名映射 */
export const FORMAT_EXTENSION_MAP: Record<ExportFormat, string> = {
  png: '.png',
  jpeg: '.jpg',
  webp: '.webp',
};
