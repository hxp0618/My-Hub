/**
 * SVG 工具组件
 * 提供 SVG 代码与图片之间的双向转换功能
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ToolComponentProps } from '../../../../types/tools';
import {
  ExportFormat,
  ExportOptions,
  DEFAULT_EXPORT_OPTIONS,
  PRESET_SIZES,
  FORMAT_EXTENSION_MAP,
} from '../../../../types/svg';
import {
  validateSVG,
  parseSVGInfo,
  formatSVG,
  minifySVG,
  svgToImage,
  readSVGFile,
  calculateAspectRatio,
  downloadImage,
} from '../../../../services/svgService';

const SVGTool: React.FC<ToolComponentProps> = () => {
  const { t } = useTranslation();
  
  // SVG 代码状态
  const [svgCode, setSvgCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  // 导出选项状态
  const [exportOptions, setExportOptions] = useState<ExportOptions>(DEFAULT_EXPORT_OPTIONS);
  const [selectedPreset, setSelectedPreset] = useState<string>('512×512');
  const [isCustomSize, setIsCustomSize] = useState(false);
  
  // 转换结果状态
  const [convertedImage, setConvertedImage] = useState<string | null>(null);
  const [convertedBlob, setConvertedBlob] = useState<Blob | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  
  // 文件上传引用
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  // 验证 SVG 代码并自动生成预览
  useEffect(() => {
    if (svgCode.trim()) {
      const result = validateSVG(svgCode);
      if (result.valid) {
        setError(null);
        // 自动转换为图片预览
        const autoConvert = async () => {
          setIsConverting(true);
          try {
            const convertResult = await svgToImage(svgCode, exportOptions);
            if (convertResult.success && convertResult.dataUrl && convertResult.blob) {
              setConvertedImage(convertResult.dataUrl);
              setConvertedBlob(convertResult.blob);
            }
          } catch (e) {
            // 静默处理转换错误，不影响 SVG 预览
            console.error('Auto convert error:', e);
          } finally {
            setIsConverting(false);
          }
        };
        // 使用防抖，避免频繁转换
        const timer = setTimeout(autoConvert, 300);
        return () => clearTimeout(timer);
      } else {
        setError(result.error || t('tools.svgTool.invalidSVG'));
        setConvertedImage(null);
        setConvertedBlob(null);
      }
    } else {
      setError(null);
      setConvertedImage(null);
      setConvertedBlob(null);
    }
  }, [svgCode, exportOptions, t]);

  // 处理代码变化
  const handleCodeChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setSvgCode(e.target.value);
    // 不再手动清除转换结果，由 useEffect 自动处理
  }, []);

  // 格式化代码
  const handleFormat = useCallback(() => {
    if (svgCode.trim()) {
      setSvgCode(formatSVG(svgCode));
    }
  }, [svgCode]);

  // 压缩代码
  const handleMinify = useCallback(() => {
    if (svgCode.trim()) {
      setSvgCode(minifySVG(svgCode));
    }
  }, [svgCode]);

  // 清空
  const handleClear = useCallback(() => {
    setSvgCode('');
    setError(null);
    setConvertedImage(null);
    setConvertedBlob(null);
  }, []);

  // 复制代码
  const handleCopy = useCallback(async () => {
    if (svgCode.trim()) {
      await navigator.clipboard.writeText(svgCode);
    }
  }, [svgCode]);

  // 下载图片
  const handleDownload = useCallback(() => {
    if (convertedBlob) {
      const filename = `svg-export${FORMAT_EXTENSION_MAP[exportOptions.format]}`;
      downloadImage(convertedBlob, filename);
    }
  }, [convertedBlob, exportOptions.format]);

  // 处理文件上传
  const handleFileUpload = useCallback(async (file: File) => {
    try {
      const content = await readSVGFile(file);
      setSvgCode(content);
      setConvertedImage(null);
      setConvertedBlob(null);
    } catch (e) {
      setError(t('tools.svgTool.unsupportedFormat'));
    }
  }, [t]);

  // 文件选择
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  }, [handleFileUpload]);

  // 拖拽处理
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  }, [handleFileUpload]);

  // 处理预设尺寸选择
  const handlePresetChange = useCallback((preset: string) => {
    if (preset === 'custom') {
      setIsCustomSize(true);
      setSelectedPreset('custom');
    } else {
      setIsCustomSize(false);
      setSelectedPreset(preset);
      const size = PRESET_SIZES.find(s => s.label === preset);
      if (size) {
        setExportOptions(prev => ({
          ...prev,
          width: size.width,
          height: size.height,
        }));
      }
    }
  }, []);

  // 处理自定义尺寸变化
  const handleSizeChange = useCallback((dimension: 'width' | 'height', value: number) => {
    if (exportOptions.maintainAspectRatio && svgCode.trim()) {
      const info = parseSVGInfo(svgCode);
      if (info) {
        const newSize = calculateAspectRatio(
          info.width,
          info.height,
          dimension === 'width' ? value : undefined,
          dimension === 'height' ? value : undefined
        );
        setExportOptions(prev => ({
          ...prev,
          width: newSize.width,
          height: newSize.height,
        }));
        return;
      }
    }
    setExportOptions(prev => ({
      ...prev,
      [dimension]: value,
    }));
  }, [exportOptions.maintainAspectRatio, svgCode]);

  // 获取 SVG 信息
  const svgInfo = svgCode.trim() ? parseSVGInfo(svgCode) : null;

  return (
    <div className="h-full flex flex-col p-4 overflow-hidden">
      {/* 主内容区 - 占据大部分空间 */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-0">
        {/* 左侧：代码编辑器 */}
        <div className="flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-secondary">
              {t('tools.svgTool.svgCode')}
            </label>
            <div className="flex items-center gap-1">
              <button
                onClick={handleFormat}
                disabled={!svgCode.trim()}
                className="px-2 py-1 text-xs bg-secondary hover:bg-secondary/80 rounded transition-colors disabled:opacity-50"
              >
                {t('tools.svgTool.format')}
              </button>
              <button
                onClick={handleMinify}
                disabled={!svgCode.trim()}
                className="px-2 py-1 text-xs bg-secondary hover:bg-secondary/80 rounded transition-colors disabled:opacity-50"
              >
                {t('tools.svgTool.minify')}
              </button>
              <button
                onClick={handleCopy}
                disabled={!svgCode.trim()}
                className="px-2 py-1 text-xs bg-secondary hover:bg-secondary/80 rounded transition-colors disabled:opacity-50"
              >
                {t('tools.svgTool.copy')}
              </button>
              <button
                onClick={handleClear}
                disabled={!svgCode.trim()}
                className="px-2 py-1 text-xs bg-secondary hover:bg-secondary/80 rounded transition-colors disabled:opacity-50"
              >
                {t('tools.svgTool.clear')}
              </button>
            </div>
          </div>
          <textarea
            value={svgCode}
            onChange={handleCodeChange}
            placeholder={t('tools.svgTool.svgCodePlaceholder')}
            className="flex-1 w-full p-3 font-mono text-sm border border-default rounded-lg bg-surface text-main focus:ring-2 focus:ring-accent resize-none min-h-[300px]"
            spellCheck={false}
          />
          <div className="mt-2 flex items-center justify-between">
            {error ? (
              <p className="text-sm text-red-500">{error}</p>
            ) : svgInfo ? (
              <p className="text-sm text-secondary">
                {t('tools.svgTool.originalSize')}: {svgInfo.width} × {svgInfo.height}
              </p>
            ) : (
              <span />
            )}
          </div>
        </div>

        {/* 右侧：预览区 */}
        <div className="flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-secondary">
              {t('tools.svgTool.preview')}
            </label>
            {isConverting && (
              <span className="text-xs text-secondary animate-pulse">
                {t('common.loading')}
              </span>
            )}
          </div>
          <div className="flex-1 border border-default rounded-lg bg-surface flex items-center justify-center overflow-hidden relative min-h-[300px]">
            {/* 棋盘格背景，用于显示透明区域 */}
            <div 
              className="absolute inset-0 opacity-10"
              style={{
                backgroundImage: 'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)',
                backgroundSize: '16px 16px',
                backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px'
              }}
            />
            {convertedImage ? (
              <img
                src={convertedImage}
                alt="Converted"
                className="max-w-full max-h-full object-contain relative z-10"
              />
            ) : svgCode.trim() && !error ? (
              <div
                className="max-w-full max-h-full relative z-10 flex items-center justify-center p-4"
                style={{ width: '100%', height: '100%' }}
                dangerouslySetInnerHTML={{ __html: svgCode }}
              />
            ) : (
              <span className="text-secondary text-sm relative z-10">
                {t('tools.svgTool.svgCodePlaceholder')}
              </span>
            )}
          </div>
          <div className="mt-2">
            {convertedImage && (
              <p className="text-sm text-secondary">
                {t('tools.svgTool.convertedSize')}: {exportOptions.width} × {exportOptions.height}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* 底部：导出设置和文件上传 */}
      <div className="mt-4 flex-shrink-0 space-y-3">
        {/* 导出设置 - 紧凑布局 */}
        <div className="p-3 border border-default rounded-lg bg-secondary/30">
          <div className="flex flex-wrap items-center gap-4">
            {/* 格式选择 */}
            <div className="flex items-center gap-2">
              <label className="text-sm text-secondary whitespace-nowrap">
                {t('tools.svgTool.exportFormat')}:
              </label>
              <select
                value={exportOptions.format}
                onChange={(e) => setExportOptions(prev => ({ ...prev, format: e.target.value as ExportFormat }))}
                className="px-2 py-1 text-sm border border-default rounded bg-surface text-main"
              >
                <option value="png">PNG</option>
                <option value="jpeg">JPEG</option>
                <option value="webp">WebP</option>
              </select>
            </div>

            {/* 尺寸选择 */}
            <div className="flex items-center gap-2">
              <label className="text-sm text-secondary whitespace-nowrap">
                {t('tools.svgTool.exportSize')}:
              </label>
              <select
                value={selectedPreset}
                onChange={(e) => handlePresetChange(e.target.value)}
                className="px-2 py-1 text-sm border border-default rounded bg-surface text-main"
              >
                {PRESET_SIZES.map(size => (
                  <option key={size.label} value={size.label}>{size.label}</option>
                ))}
                <option value="custom">{t('tools.svgTool.customSize')}</option>
              </select>
            </div>

            {/* 自定义尺寸 */}
            {isCustomSize && (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={exportOptions.width}
                  onChange={(e) => handleSizeChange('width', parseInt(e.target.value) || 0)}
                  className="w-16 px-2 py-1 text-sm border border-default rounded bg-surface text-main"
                  min="1"
                />
                <span className="text-secondary">×</span>
                <input
                  type="number"
                  value={exportOptions.height}
                  onChange={(e) => handleSizeChange('height', parseInt(e.target.value) || 0)}
                  className="w-16 px-2 py-1 text-sm border border-default rounded bg-surface text-main"
                  min="1"
                />
                <label className="flex items-center gap-1 text-xs text-secondary">
                  <input
                    type="checkbox"
                    checked={exportOptions.maintainAspectRatio}
                    onChange={(e) => setExportOptions(prev => ({ ...prev, maintainAspectRatio: e.target.checked }))}
                    className="rounded"
                  />
                  {t('tools.svgTool.maintainAspectRatio')}
                </label>
              </div>
            )}

            {/* 质量滑块 */}
            {(exportOptions.format === 'jpeg' || exportOptions.format === 'webp') && (
              <div className="flex items-center gap-2">
                <label className="text-sm text-secondary whitespace-nowrap">
                  {t('tools.svgTool.quality')}: {exportOptions.quality}%
                </label>
                <input
                  type="range"
                  min="1"
                  max="100"
                  value={exportOptions.quality}
                  onChange={(e) => setExportOptions(prev => ({ ...prev, quality: parseInt(e.target.value) }))}
                  className="w-24"
                />
              </div>
            )}

            {/* 下载按钮 */}
            <button
              onClick={handleDownload}
              disabled={!convertedBlob || isConverting}
              className="px-4 py-1.5 text-sm bg-accent text-accent-foreground rounded-lg hover:bg-accent/80 transition-colors disabled:opacity-50"
            >
              {t('tools.svgTool.download')}
            </button>

            {/* 文件上传 */}
            <div
              ref={dropZoneRef}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 min-w-[200px] px-4 py-1.5 border border-dashed border-default rounded-lg text-center cursor-pointer hover:border-accent transition-colors"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".svg,image/svg+xml"
                onChange={handleFileSelect}
                className="hidden"
              />
              <p className="text-secondary text-sm">{t('tools.svgTool.uploadHint')}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SVGTool;
