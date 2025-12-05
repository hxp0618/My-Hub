import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ToolCard } from '../../../../components/ToolCard';
import { TOOL_METADATA, ToolId, ToolComponentProps } from '../../../../types/tools';
import { QRCodeOptions as QRCodeOptionsComponent } from './qrcode/QRCodeOptions';
import { QRCodeImageList } from './qrcode/QRCodeImageList';
import { QRCodeScanner } from './qrcode/QRCodeScanner';
import { BatchModeToggle } from './qrcode/BatchModeToggle';
import { useQRCodeStorage } from '../../../../hooks/useQRCodeStorage';
import { generateQRCode, generateBatchQRCodes, downloadImage, downloadAsZip } from '../../../../utils/qrcode';
import type { QRCodeOptions } from '../../../../types/qrcode';
import { DEFAULT_QRCODE_OPTIONS } from '../../../../types/qrcode';

type TabType = 'generate' | 'scan';

/**
 * 导出生成函数供测试使用
 */
export const generateQRCodeDataUrl = async (
  content: string,
  size: number
): Promise<string | null> => {
  return generateQRCode(content, { ...DEFAULT_QRCODE_OPTIONS, size: size as 128 | 256 | 384 | 512 });
};

/**
 * 二维码生成器工具组件（增强版）
 */
export const QRCodeGeneratorTool: React.FC<ToolComponentProps> = ({
  isExpanded,
  onToggleExpand,
}) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabType>('generate');
  const [content, setContent] = useState('');
  const [options, setOptions] = useState<QRCodeOptions>(DEFAULT_QRCODE_OPTIONS);
  const [batchMode, setBatchMode] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const {
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
    selectedImages,
    hasSelected,
    allSelected,
  } = useQRCodeStorage();

  // 实时预览（非批量模式）
  useEffect(() => {
    if (batchMode) {
      setPreviewUrl(null);
      return;
    }

    const generate = async () => {
      if (content.trim()) {
        const url = await generateQRCode(content, options);
        setPreviewUrl(url);
      } else {
        setPreviewUrl(null);
      }
    };
    generate();
  }, [content, options, batchMode]);

  // 生成二维码
  const handleGenerate = useCallback(async () => {
    if (!content.trim()) return;

    setIsGenerating(true);
    try {
      if (batchMode) {
        const lines = content.split('\n');
        const newImages = await generateBatchQRCodes(lines, options);
        addImages(newImages);
        setContent('');
      } else {
        const dataUrl = await generateQRCode(content, options);
        if (dataUrl) {
          addImage(content, dataUrl, options);
          setContent('');
          setPreviewUrl(null);
        }
      }
    } finally {
      setIsGenerating(false);
    }
  }, [content, options, batchMode, addImage, addImages]);

  // 再建一个
  const handleCreateAnother = useCallback(async () => {
    if (!previewUrl || !content.trim()) return;
    addImage(content, previewUrl, options);
    setContent('');
    setPreviewUrl(null);
  }, [content, previewUrl, options, addImage]);

  // 下载单个图片
  const handleDownloadSingle = useCallback(
    (id: string) => {
      const image = images.find(img => img.id === id);
      if (image) {
        const filename = `qrcode_${image.content.slice(0, 20).replace(/[^a-zA-Z0-9]/g, '_')}.png`;
        downloadImage(image.dataUrl, filename);
      }
    },
    [images]
  );

  // 下载选中的图片
  const handleDownloadSelected = useCallback(async () => {
    if (selectedImages.length === 1) {
      handleDownloadSingle(selectedImages[0].id);
    } else if (selectedImages.length > 1) {
      await downloadAsZip(selectedImages);
    }
  }, [selectedImages, handleDownloadSingle]);

  return (
    <ToolCard
      tool={TOOL_METADATA[ToolId.QRCODE_GENERATOR]}
      isExpanded={isExpanded}
      onToggleExpand={onToggleExpand}
    >
      <div className="h-full flex flex-col gap-4">
        {/* 标签切换 */}
        <div className="flex gap-2 nb-border-b pb-2">
          <button
            onClick={() => setActiveTab('generate')}
            className={`nb-btn text-sm ${
              activeTab === 'generate'
                ? 'nb-btn-primary'
                : 'nb-btn-secondary'
            }`}
          >
            {t('tools.qrcodeGenerator.tabs.generate')}
          </button>
          <button
            onClick={() => setActiveTab('scan')}
            className={`nb-btn text-sm ${
              activeTab === 'scan'
                ? 'nb-btn-primary'
                : 'nb-btn-secondary'
            }`}
          >
            {t('tools.qrcodeGenerator.tabs.scan')}
          </button>
        </div>

        {/* 生成模式 */}
        {activeTab === 'generate' && (
          <div className="flex-1 flex flex-col gap-4 overflow-auto">
            <div className="grid grid-cols-2 gap-4">
              {/* 左侧：输入区 */}
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium nb-text mb-2">
                    {t('tools.qrcodeGenerator.content')}
                  </label>
                  <textarea
                    value={content}
                    onChange={e => setContent(e.target.value)}
                    placeholder={
                      batchMode
                        ? t('tools.qrcodeGenerator.batchModeHint')
                        : t('tools.qrcodeGenerator.contentPlaceholder')
                    }
                    rows={batchMode ? 6 : 3}
                    className="nb-input w-full text-sm resize-none"
                  />
                </div>

                <BatchModeToggle enabled={batchMode} onChange={setBatchMode} />

                <div className="flex gap-2">
                  <button
                    onClick={handleGenerate}
                    disabled={!content.trim() || isGenerating}
                    className="nb-btn nb-btn-primary text-sm"
                  >
                    {isGenerating ? t('common.loading') : t('tools.qrcodeGenerator.generate')}
                  </button>
                  {!batchMode && previewUrl && (
                    <button
                      onClick={handleCreateAnother}
                      className="nb-btn nb-btn-secondary text-sm"
                    >
                      {t('tools.qrcodeGenerator.createAnother')}
                    </button>
                  )}
                </div>
              </div>

              {/* 右侧：配置和预览 */}
              <div className="space-y-4">
                <QRCodeOptionsComponent options={options} onChange={setOptions} />

                {/* 预览区（非批量模式） */}
                {!batchMode && (
                  <div className="flex items-center justify-center nb-card-static h-[200px] overflow-hidden">
                    {previewUrl ? (
                      <img
                        src={previewUrl}
                        alt="QR Code Preview"
                        className="max-w-[180px] max-h-[180px] object-contain"
                        style={{ imageRendering: 'pixelated' }}
                      />
                    ) : (
                      <div className="text-center nb-text-secondary">
                        <span className="material-symbols-outlined text-4xl mb-2">qr_code_2</span>
                        <p className="text-sm">{t('tools.qrcodeGenerator.emptyContent')}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* 图片列表 */}
            <QRCodeImageList
              images={images}
              onSelect={toggleSelect}
              onSelectAll={selectAll}
              onDelete={removeImage}
              onDeleteSelected={removeSelected}
              onDownload={handleDownloadSingle}
              onDownloadSelected={handleDownloadSelected}
              hasSelected={hasSelected}
              allSelected={allSelected}
            />
          </div>
        )}

        {/* 识别模式 */}
        {activeTab === 'scan' && (
          <div className="flex-1 overflow-auto">
            <QRCodeScanner
              scanImages={scanImages}
              onAddScanImage={addScanImage}
              onDelete={removeScanImage}
              onClear={clearScanImages}
            />
          </div>
        )}
      </div>
    </ToolCard>
  );
};
