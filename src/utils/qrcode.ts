/**
 * 二维码工具函数
 */
import QRCode from 'qrcode';
import jsQR from 'jsqr';
import JSZip from 'jszip';
import { v4 as uuidv4 } from 'uuid';
import type { QRCodeOptions, QRCodeImage } from '../types/qrcode';
import { sanitizeQRCodeOptions } from '../types/qrcode';
import { requireHostPermission } from './extensionPermissions';

const IMAGE_CONTENT_TYPE_PREFIX = 'image/';
const IMAGE_URL_EXTENSION_RE = /\.(?:png|jpe?g|webp|gif|bmp|svg|ico|avif)(?:[?#].*)?$/i;
const QR_CODE_LOGO_RATIO_MIN = 0.15;
const QR_CODE_LOGO_RATIO_MAX = 0.4;

export type QRCodeTemplateId = 'text' | 'url' | 'wifi' | 'vcard' | 'email' | 'sms';

export interface QRCodeTemplate {
  id: QRCodeTemplateId;
  labelKey: string;
}

export const QR_CODE_TEMPLATES: QRCodeTemplate[] = [
  { id: 'text', labelKey: 'tools.qrcodeGenerator.templates.text' },
  { id: 'url', labelKey: 'tools.qrcodeGenerator.templates.url' },
  { id: 'wifi', labelKey: 'tools.qrcodeGenerator.templates.wifi' },
  { id: 'vcard', labelKey: 'tools.qrcodeGenerator.templates.vcard' },
  { id: 'email', labelKey: 'tools.qrcodeGenerator.templates.email' },
  { id: 'sms', labelKey: 'tools.qrcodeGenerator.templates.sms' },
];

export function buildQRCodeTemplateContent(
  templateId: QRCodeTemplateId,
  values: Record<string, string | boolean | undefined>
): string {
  const getValue = (key: string) => String(values[key] ?? '').trim();
  const escapeWifiValue = (value: string) => value.replace(/([\\;,:"@])/g, '\\$1');

  switch (templateId) {
    case 'url': {
      const url = getValue('url');
      if (!url) return '';
      return /^[a-z][a-z\d+.-]*:\/\//i.test(url) ? url : `https://${url}`;
    }
    case 'wifi': {
      const encryption = getValue('encryption') || 'WPA';
      const ssid = escapeWifiValue(getValue('ssid'));
      const password = escapeWifiValue(getValue('password'));
      const hidden = values.hidden === true ? 'true' : '';
      return `WIFI:T:${encryption};S:${ssid};P:${password};H:${hidden};;`;
    }
    case 'vcard': {
      const name = getValue('name');
      const phone = getValue('phone');
      const email = getValue('email');
      const org = getValue('organization');
      const lines = ['BEGIN:VCARD', 'VERSION:3.0'];
      if (name) lines.push(`FN:${name}`);
      if (org) lines.push(`ORG:${org}`);
      if (phone) lines.push(`TEL:${phone}`);
      if (email) lines.push(`EMAIL:${email}`);
      lines.push('END:VCARD');
      return lines.join('\n');
    }
    case 'email': {
      const email = getValue('email');
      const params = new URLSearchParams();
      const subject = getValue('subject');
      const body = getValue('body');
      if (subject) params.set('subject', subject);
      if (body) params.set('body', body);
      const query = params.toString();
      return `mailto:${email}${query ? `?${query}` : ''}`;
    }
    case 'sms': {
      const phone = getValue('phone');
      const message = getValue('message');
      return `sms:${phone}${message ? `?body=${encodeURIComponent(message)}` : ''}`;
    }
    case 'text':
    default:
      return getValue('text');
  }
}

export function calculateQRCodeLogoBox(
  qrSize: number,
  ratio: number
): { x: number; y: number; size: number } {
  const safeSize = Number.isFinite(qrSize) && qrSize > 0 ? qrSize : 256;
  const safeRatio = Number.isFinite(ratio)
    ? Math.min(QR_CODE_LOGO_RATIO_MAX, Math.max(QR_CODE_LOGO_RATIO_MIN, ratio))
    : 0.22;
  const size = Math.round(safeSize * safeRatio);
  const offset = Math.round((safeSize - size) / 2);

  return { x: offset, y: offset, size };
}

export function normalizeQRCodeContents(contents: string[]): string[] {
  const seen = new Set<string>();

  return contents.flatMap(content => {
    const normalizedContent = content.trim();
    if (!normalizedContent || seen.has(normalizedContent)) return [];
    seen.add(normalizedContent);
    return [normalizedContent];
  });
}

export function createQRCodeFileName(content: string, index?: number): string {
  const safeContent = content
    .trim()
    .slice(0, 40)
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 30) || 'content';
  const indexPart = typeof index === 'number' ? `${index + 1}_` : '';

  return `qrcode_${indexPart}${safeContent}.png`;
}

/**
 * 生成二维码 Data URL（增强版）
 * @param content 二维码内容
 * @param options 配置选项
 * @returns Data URL 或 null
 */
export async function generateQRCode(
  content: string,
  options: QRCodeOptions
): Promise<string | null> {
  if (!content.trim()) return null;

  try {
    const safeOptions = sanitizeQRCodeOptions(options);

    return await QRCode.toDataURL(content, {
      width: safeOptions.size,
      margin: safeOptions.margin,
      errorCorrectionLevel: safeOptions.errorCorrectionLevel,
      color: {
        dark: safeOptions.foregroundColor,
        light: safeOptions.backgroundColor,
      },
    });
  } catch {
    return null;
  }
}

export async function generateQRCodeSvg(
  content: string,
  options: QRCodeOptions
): Promise<string | null> {
  if (!content.trim()) return null;

  try {
    const safeOptions = sanitizeQRCodeOptions(options);
    return await QRCode.toString(content, {
      type: 'svg',
      width: safeOptions.size,
      margin: safeOptions.margin,
      errorCorrectionLevel: safeOptions.errorCorrectionLevel,
      color: {
        dark: safeOptions.foregroundColor,
        light: safeOptions.backgroundColor,
      },
    });
  } catch {
    return null;
  }
}

export async function applyQRCodeLogo(
  qrDataUrl: string,
  logoDataUrl: string,
  size: number,
  ratio = 0.24
): Promise<string> {
  if (!logoDataUrl) return qrDataUrl;

  const load = (src: string) => new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('imageLoadError'));
    img.src = src;
  });

  const [qrImage, logoImage] = await Promise.all([load(qrDataUrl), load(logoDataUrl)]);
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  if (!context) return qrDataUrl;

  context.drawImage(qrImage, 0, 0, size, size);
  const box = calculateQRCodeLogoBox(size, ratio);
  const padding = Math.max(4, Math.round(box.size * 0.12));
  context.fillStyle = '#ffffff';
  context.fillRect(box.x - padding, box.y - padding, box.size + padding * 2, box.size + padding * 2);
  context.drawImage(logoImage, box.x, box.y, box.size, box.size);

  return canvas.toDataURL('image/png');
}

/**
 * 批量生成二维码
 * @param contents 内容数组（每行一个）
 * @param options 配置选项
 * @returns 生成的二维码图片数组
 */
export async function generateBatchQRCodes(
  contents: string[],
  options: QRCodeOptions
): Promise<QRCodeImage[]> {
  const nonEmptyContents = normalizeQRCodeContents(contents);
  const safeOptions = sanitizeQRCodeOptions(options);
  const results: QRCodeImage[] = [];

  for (const content of nonEmptyContents) {
    const dataUrl = await generateQRCode(content, safeOptions);
    if (dataUrl) {
      results.push({
        id: uuidv4(),
        content,
        dataUrl,
        options: { ...safeOptions },
        createdAt: Date.now(),
        selected: false,
      });
    }
  }

  return results;
}


/**
 * 识别二维码内容
 * @param imageDataUrl 图片的 Data URL
 * @returns 识别的内容或 null
 */
export async function decodeQRCode(imageDataUrl: string): Promise<string | null> {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(null);
        return;
      }

      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height);

      resolve(code?.data || null);
    };
    img.onerror = () => resolve(null);
    img.src = imageDataUrl;
  });
}

export function parseOnlineImageUrl(value: string): string | null {
  const trimmedValue = value.trim();
  if (!trimmedValue) return null;

  try {
    const url = new URL(trimmedValue);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function isLikelyImageUrl(url: string): boolean {
  return IMAGE_URL_EXTENSION_RE.test(url);
}

export async function blobToDataUrl(blob: Blob): Promise<string> {
  const readArrayBuffer = async () => {
    const blobWithArrayBuffer = blob as Blob & { arrayBuffer?: () => Promise<ArrayBuffer> };
    if (typeof blobWithArrayBuffer.arrayBuffer === 'function') {
      return blobWithArrayBuffer.arrayBuffer();
    }

    return new Promise<ArrayBuffer>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (reader.result instanceof ArrayBuffer) {
          resolve(reader.result);
          return;
        }
        reject(new Error('blobReadError'));
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(blob);
    });
  };
  const bytes = new Uint8Array(await readArrayBuffer());
  const chunkSize = 0x8000;
  let binary = '';

  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }

  return `data:${blob.type || ''};base64,${btoa(binary)}`;
}

export async function fetchImageDataUrl(
  value: string,
  fetcher: (input: string) => Promise<Response> = fetch
): Promise<string> {
  const url = parseOnlineImageUrl(value);
  if (!url) throw new Error('invalidImageUrl');

  await requireHostPermission(url);
  const response = await fetcher(url);
  if (!response.ok) throw new Error('imageUrlLoadError');

  const blob = await response.blob();
  const contentTypeHeader = response.headers.get('content-type') || '';
  const contentType = (contentTypeHeader || blob.type).toLowerCase();
  if (!contentType.startsWith(IMAGE_CONTENT_TYPE_PREFIX) && (contentType || !isLikelyImageUrl(url))) {
    throw new Error('invalidImageUrl');
  }

  return blobToDataUrl(blob);
}

/**
 * 将图片打包为 ZIP 文件
 * @param images 图片数组
 * @returns ZIP Blob
 */
export async function createZipFromImages(images: QRCodeImage[]): Promise<Blob> {
  const zip = new JSZip();

  images.forEach((image, index) => {
    // 从 data URL 提取 base64 数据
    const base64Data = image.dataUrl.split(',')[1];
    const fileName = createQRCodeFileName(image.content, index);
    zip.file(fileName, base64Data, { base64: true });
  });

  return zip.generateAsync({ type: 'blob' });
}

/**
 * 下载单个图片
 * @param dataUrl 图片 Data URL
 * @param filename 文件名
 */
export function downloadImage(dataUrl: string, filename: string = 'qrcode.png'): void {
  const link = document.createElement('a');
  link.download = filename;
  link.href = dataUrl;
  link.click();
}

/**
 * 下载多个图片为 ZIP
 * @param images 图片数组
 */
export async function downloadAsZip(images: QRCodeImage[]): Promise<void> {
  if (images.length === 0) return;

  const blob = await createZipFromImages(images);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.download = `qrcodes_${Date.now()}.zip`;
  link.href = url;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * 将文件转换为 Data URL
 * @param file 文件对象
 * @returns Data URL
 */
export function fileToDataUrl(file: File): Promise<string> {
  return blobToDataUrl(file);
}
