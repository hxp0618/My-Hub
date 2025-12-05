/**
 * SVG 服务
 * 提供 SVG 验证、格式化、压缩和转换功能
 */

import {
  ExportOptions,
  ConvertResult,
  SVGInfo,
  FORMAT_MIME_MAP,
} from '../types/svg';

/**
 * 验证 SVG 代码
 */
export function validateSVG(svgCode: string): { valid: boolean; error?: string } {
  if (!svgCode || !svgCode.trim()) {
    return { valid: false, error: 'SVG code is empty' };
  }

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgCode, 'image/svg+xml');
    
    // 检查解析错误
    const parserError = doc.querySelector('parsererror');
    if (parserError) {
      return { valid: false, error: parserError.textContent || 'Parse error' };
    }

    // 检查是否有 SVG 根元素
    const svgElement = doc.querySelector('svg');
    if (!svgElement) {
      return { valid: false, error: 'No SVG element found' };
    }

    return { valid: true };
  } catch (e) {
    return { valid: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

/**
 * 解析 SVG 信息
 */
export function parseSVGInfo(svgCode: string): SVGInfo | null {
  const validation = validateSVG(svgCode);
  if (!validation.valid) {
    return null;
  }

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgCode, 'image/svg+xml');
    const svgElement = doc.querySelector('svg');
    
    if (!svgElement) {
      return null;
    }

    const viewBox = svgElement.getAttribute('viewBox') || undefined;
    let width = 0;
    let height = 0;

    // 尝试从 width/height 属性获取尺寸
    const widthAttr = svgElement.getAttribute('width');
    const heightAttr = svgElement.getAttribute('height');

    if (widthAttr) {
      width = parseFloat(widthAttr) || 0;
    }
    if (heightAttr) {
      height = parseFloat(heightAttr) || 0;
    }

    // 如果没有 width/height，尝试从 viewBox 获取
    if ((!width || !height) && viewBox) {
      const parts = viewBox.split(/\s+|,/).map(Number);
      if (parts.length >= 4) {
        width = width || parts[2];
        height = height || parts[3];
      }
    }

    // 默认尺寸
    if (!width) width = 300;
    if (!height) height = 150;

    return {
      width,
      height,
      viewBox,
      isValid: true,
    };
  } catch {
    return null;
  }
}

/**
 * 格式化 SVG 代码
 */
export function formatSVG(svgCode: string): string {
  const validation = validateSVG(svgCode);
  if (!validation.valid) {
    return svgCode;
  }

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgCode, 'image/svg+xml');
    const serializer = new XMLSerializer();
    let formatted = serializer.serializeToString(doc);

    // 简单的格式化：在标签之间添加换行和缩进
    formatted = formatted
      .replace(/></g, '>\n<')
      .replace(/(<[^/][^>]*[^/]>)\n/g, '$1\n')
      .split('\n')
      .map((line, index) => {
        // 计算缩进级别
        const trimmed = line.trim();
        if (!trimmed) return '';
        return trimmed;
      })
      .filter(line => line)
      .join('\n');

    // 更好的缩进处理
    const lines = formatted.split('\n');
    let indent = 0;
    const indentedLines = lines.map(line => {
      const trimmed = line.trim();
      if (!trimmed) return '';
      
      // 自闭合标签或结束标签减少缩进
      if (trimmed.startsWith('</') || (trimmed.startsWith('<') && trimmed.endsWith('/>'))) {
        if (trimmed.startsWith('</')) {
          indent = Math.max(0, indent - 1);
        }
        const result = '  '.repeat(indent) + trimmed;
        return result;
      }
      
      const result = '  '.repeat(indent) + trimmed;
      
      // 开始标签增加缩进
      if (trimmed.startsWith('<') && !trimmed.startsWith('</') && !trimmed.endsWith('/>') && !trimmed.startsWith('<?')) {
        indent++;
      }
      
      return result;
    });

    return indentedLines.join('\n');
  } catch {
    return svgCode;
  }
}

/**
 * 压缩 SVG 代码
 */
export function minifySVG(svgCode: string): string {
  const validation = validateSVG(svgCode);
  if (!validation.valid) {
    return svgCode;
  }

  try {
    // 移除注释
    let minified = svgCode.replace(/<!--[\s\S]*?-->/g, '');
    
    // 移除多余空白
    minified = minified
      .replace(/\s+/g, ' ')
      .replace(/>\s+</g, '><')
      .replace(/\s+>/g, '>')
      .replace(/<\s+/g, '<')
      .trim();

    return minified;
  } catch {
    return svgCode;
  }
}

/**
 * SVG 转图片
 */
export async function svgToImage(
  svgCode: string,
  options: ExportOptions
): Promise<ConvertResult> {
  const validation = validateSVG(svgCode);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  try {
    const { format, width, height, quality } = options;
    
    // 创建 Blob URL
    const svgBlob = new Blob([svgCode], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    // 加载图片
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Failed to load SVG'));
      img.src = url;
    });

    // 创建 Canvas
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      URL.revokeObjectURL(url);
      return { success: false, error: 'Canvas context not available' };
    }

    // 如果是 JPEG，填充白色背景
    if (format === 'jpeg') {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);
    }

    // 绘制图片
    ctx.drawImage(img, 0, 0, width, height);
    URL.revokeObjectURL(url);

    // 转换为 Blob
    const mimeType = FORMAT_MIME_MAP[format];
    const qualityValue = format === 'png' ? undefined : quality / 100;

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('Conversion failed'))),
        mimeType,
        qualityValue
      );
    });

    // 转换为 Data URL
    const dataUrl = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });

    return {
      success: true,
      dataUrl,
      blob,
      width,
      height,
    };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : 'Unknown error',
    };
  }
}

/**
 * 读取 SVG 文件
 */
export function readSVGFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    // 验证文件类型
    if (!file.type.includes('svg') && !file.name.endsWith('.svg')) {
      reject(new Error('Unsupported file format'));
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      resolve(content);
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

/**
 * 计算保持宽高比的尺寸
 */
export function calculateAspectRatio(
  originalWidth: number,
  originalHeight: number,
  targetWidth?: number,
  targetHeight?: number
): { width: number; height: number } {
  if (!originalWidth || !originalHeight) {
    return { width: targetWidth || 512, height: targetHeight || 512 };
  }

  const ratio = originalWidth / originalHeight;

  if (targetWidth && !targetHeight) {
    return { width: targetWidth, height: Math.round(targetWidth / ratio) };
  }

  if (targetHeight && !targetWidth) {
    return { width: Math.round(targetHeight * ratio), height: targetHeight };
  }

  if (targetWidth && targetHeight) {
    // 保持宽高比，以较小的缩放比例为准
    const widthRatio = targetWidth / originalWidth;
    const heightRatio = targetHeight / originalHeight;
    const scale = Math.min(widthRatio, heightRatio);
    return {
      width: Math.round(originalWidth * scale),
      height: Math.round(originalHeight * scale),
    };
  }

  return { width: originalWidth, height: originalHeight };
}

/**
 * 下载图片
 */
export function downloadImage(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default {
  validateSVG,
  parseSVGInfo,
  formatSVG,
  minifySVG,
  svgToImage,
  readSVGFile,
  calculateAspectRatio,
  downloadImage,
};
