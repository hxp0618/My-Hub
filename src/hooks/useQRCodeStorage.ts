/**
 * 二维码图片 Session Storage 管理 Hook
 */
import { useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { QRCodeImage, ScanImage, QRCodeOptions } from '../types/qrcode';
import { QRCODE_STORAGE_KEYS } from '../types/qrcode';

// ============ 纯函数（可测试） ============

/**
 * 保存图片列表到 Session Storage
 */
export function saveImagesToSession(images: QRCodeImage[]): void {
  try {
    sessionStorage.setItem(QRCODE_STORAGE_KEYS.GENERATED_IMAGES, JSON.stringify(images));
  } catch {
    console.error('Failed to save images to session storage');
  }
}

/**
 * 从 Session Storage 加载图片列表
 */
export function loadImagesFromSession(): QRCodeImage[] {
  try {
    const data = sessionStorage.getItem(QRCODE_STORAGE_KEYS.GENERATED_IMAGES);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

/**
 * 清空 Session Storage 中的图片
 */
export function clearSessionImages(): void {
  sessionStorage.removeItem(QRCODE_STORAGE_KEYS.GENERATED_IMAGES);
}

/**
 * 保存识别图片到 Session Storage
 */
export function saveScanImagesToSession(images: ScanImage[]): void {
  try {
    sessionStorage.setItem(QRCODE_STORAGE_KEYS.SCAN_IMAGES, JSON.stringify(images));
  } catch {
    console.error('Failed to save scan images to session storage');
  }
}

/**
 * 从 Session Storage 加载识别图片
 */
export function loadScanImagesFromSession(): ScanImage[] {
  try {
    const data = sessionStorage.getItem(QRCODE_STORAGE_KEYS.SCAN_IMAGES);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

/**
 * 添加图片到列表
 */
export function addImageToList(
  images: QRCodeImage[],
  content: string,
  dataUrl: string,
  options: QRCodeOptions
): QRCodeImage[] {
  const newImage: QRCodeImage = {
    id: uuidv4(),
    content,
    dataUrl,
    options,
    createdAt: Date.now(),
    selected: false,
  };
  return [...images, newImage];
}

/**
 * 从列表中删除图片
 */
export function removeImageFromList(images: QRCodeImage[], id: string): QRCodeImage[] {
  return images.filter(img => img.id !== id);
}

/**
 * 切换图片选中状态
 */
export function toggleImageSelection(images: QRCodeImage[], id: string): QRCodeImage[] {
  return images.map(img => (img.id === id ? { ...img, selected: !img.selected } : img));
}

/**
 * 全选/取消全选
 */
export function toggleAllSelection(images: QRCodeImage[], selected: boolean): QRCodeImage[] {
  return images.map(img => ({ ...img, selected }));
}

/**
 * 删除选中的图片
 */
export function removeSelectedImages(images: QRCodeImage[]): QRCodeImage[] {
  return images.filter(img => !img.selected);
}

/**
 * 获取选中的图片
 */
export function getSelectedImages(images: QRCodeImage[]): QRCodeImage[] {
  return images.filter(img => img.selected);
}

// ============ React Hook ============

export function useQRCodeStorage() {
  const [images, setImages] = useState<QRCodeImage[]>([]);
  const [scanImages, setScanImages] = useState<ScanImage[]>([]);

  // 初始化时从 Session Storage 加载
  useEffect(() => {
    setImages(loadImagesFromSession());
    setScanImages(loadScanImagesFromSession());
  }, []);

  // 图片列表变化时保存到 Session Storage
  useEffect(() => {
    saveImagesToSession(images);
  }, [images]);

  // 识别图片列表变化时保存
  useEffect(() => {
    saveScanImagesToSession(scanImages);
  }, [scanImages]);

  const addImage = useCallback(
    (content: string, dataUrl: string, options: QRCodeOptions) => {
      setImages(prev => addImageToList(prev, content, dataUrl, options));
    },
    []
  );

  const addImages = useCallback((newImages: QRCodeImage[]) => {
    setImages(prev => [...prev, ...newImages]);
  }, []);

  const removeImage = useCallback((id: string) => {
    setImages(prev => removeImageFromList(prev, id));
  }, []);

  const toggleSelect = useCallback((id: string) => {
    setImages(prev => toggleImageSelection(prev, id));
  }, []);

  const selectAll = useCallback((selected: boolean) => {
    setImages(prev => toggleAllSelection(prev, selected));
  }, []);

  const removeSelected = useCallback(() => {
    setImages(prev => removeSelectedImages(prev));
  }, []);

  const clearAll = useCallback(() => {
    setImages([]);
    clearSessionImages();
  }, []);

  const addScanImage = useCallback((originalDataUrl: string, decodedContent: string | null) => {
    const newScanImage: ScanImage = {
      id: uuidv4(),
      originalDataUrl,
      decodedContent,
      createdAt: Date.now(),
    };
    setScanImages(prev => [...prev, newScanImage]);
  }, []);

  const removeScanImage = useCallback((id: string) => {
    setScanImages(prev => prev.filter(img => img.id !== id));
  }, []);

  const clearScanImages = useCallback(() => {
    setScanImages([]);
    sessionStorage.removeItem(QRCODE_STORAGE_KEYS.SCAN_IMAGES);
  }, []);

  return {
    images,
    scanImages,
    addImage,
    addImages,
    removeImage,
    toggleSelect,
    selectAll,
    removeSelected,
    clearAll,
    addScanImage,
    removeScanImage,
    clearScanImages,
    selectedImages: getSelectedImages(images),
    hasSelected: images.some(img => img.selected),
    allSelected: images.length > 0 && images.every(img => img.selected),
  };
}
