/**
 * 二维码工具函数
 */
import QRCode from 'qrcode';
import jsQR from 'jsqr';
import JSZip from 'jszip';
import { v4 as uuidv4 } from 'uuid';
import type { QRCodeOptions, QRCodeImage, DEFAULT_QRCODE_OPTIONS } from '../types/qrcode';

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
    return await QRCode.toDataURL(content, {
      width: options.size,
      margin: options.margin,
      errorCorrectionLevel: options.errorCorrectionLevel,
      color: {
        dark: options.foregroundColor,
        light: options.backgroundColor,
      },
    });
  } catch {
    return null;
  }
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
  const nonEmptyContents = contents.filter(c => c.trim());
  const results: QRCodeImage[] = [];

  for (const content of nonEmptyContents) {
    const dataUrl = await generateQRCode(content, options);
    if (dataUrl) {
      results.push({
        id: uuidv4(),
        content: content.trim(),
        dataUrl,
        options: { ...options },
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
    const fileName = `qrcode_${index + 1}_${image.content.slice(0, 20).replace(/[^a-zA-Z0-9]/g, '_')}.png`;
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
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
