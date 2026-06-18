import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { ToolCard } from '../../../../components/ToolCard';
import { Modal } from '../../../../components/Modal';
import { TOOL_METADATA, ToolId, ToolComponentProps } from '../../../../types/tools';
import { QRCodeOptions as QRCodeOptionsComponent } from './qrcode/QRCodeOptions';
import { QRCodeImageList } from './qrcode/QRCodeImageList';
import { QRCodeScanner } from './qrcode/QRCodeScanner';
import { BatchModeToggle } from './qrcode/BatchModeToggle';
import { useQRCodeStorage } from '../../../../hooks/useQRCodeStorage';
import {
  applyQRCodeLogo,
  buildQRCodeTemplateContent,
  createQRCodeFileName,
  generateQRCode,
  generateBatchQRCodes,
  generateQRCodeSvg,
  downloadImage,
  downloadAsZip,
  QR_CODE_TEMPLATES,
  QRCodeTemplateId,
} from '../../../../utils/qrcode';
import type { QRCodeOptions } from '../../../../types/qrcode';
import { DEFAULT_QRCODE_OPTIONS } from '../../../../types/qrcode';

type TabType = 'generate' | 'scan';
type QRCodePreviewState = { dataUrl: string; title: string; detail: string };

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
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<TabType>('generate');
  const [templateId, setTemplateId] = useState<QRCodeTemplateId>('text');
  const [templateValues, setTemplateValues] = useState<Record<string, string | boolean>>({
    encryption: 'WPA',
  });
  const [content, setContent] = useState('');
  const [options, setOptions] = useState<QRCodeOptions>(DEFAULT_QRCODE_OPTIONS);
  const [batchMode, setBatchMode] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [logoDataUrl, setLogoDataUrl] = useState('');
  const [previewImage, setPreviewImage] = useState<QRCodePreviewState | null>(null);

  const {
    images,
    scanImages,
    addImage,
    addImages,
    removeImage,
    toggleSelect,
    selectAll,
    removeSelected,
    addScanImage,
    removeScanImage,
    clearScanImages,
    selectedImages,
    hasSelected,
    allSelected,
  } = useQRCodeStorage();

  const effectiveContent = useMemo(() => (
    batchMode || templateId === 'text'
      ? content
      : buildQRCodeTemplateContent(templateId, templateValues)
  ), [batchMode, content, templateId, templateValues]);

  const generateCurrentQRCode = useCallback(async (value: string) => {
    const dataUrl = await generateQRCode(value, options);
    if (!dataUrl) return null;

    return logoDataUrl
      ? applyQRCodeLogo(dataUrl, logoDataUrl, options.size)
      : dataUrl;
  }, [logoDataUrl, options]);

  // 实时预览（非批量模式）
  useEffect(() => {
    if (batchMode) {
      setPreviewUrl(null);
      return;
    }

    const generate = async () => {
      if (effectiveContent.trim()) {
        const url = await generateCurrentQRCode(effectiveContent);
        setPreviewUrl(url);
      } else {
        setPreviewUrl(null);
      }
    };
    generate();
  }, [batchMode, effectiveContent, generateCurrentQRCode]);

  // 生成二维码
  const handleGenerate = useCallback(async () => {
    if (!effectiveContent.trim()) return;

    setIsGenerating(true);
    try {
      if (batchMode) {
        const lines = content.split('\n');
        const newImages = await generateBatchQRCodes(lines, options);
        if (logoDataUrl) {
          for (const image of newImages) {
            image.dataUrl = await applyQRCodeLogo(image.dataUrl, logoDataUrl, image.options.size);
          }
        }
        addImages(newImages);
        setContent('');
      } else {
        const dataUrl = await generateCurrentQRCode(effectiveContent);
        if (dataUrl) {
          addImage(effectiveContent, dataUrl, options);
          setContent('');
          setPreviewUrl(null);
        }
      }
    } finally {
      setIsGenerating(false);
    }
  }, [effectiveContent, batchMode, content, options, logoDataUrl, addImage, addImages, generateCurrentQRCode]);

  // 再建一个
  const handleCreateAnother = useCallback(async () => {
    if (!previewUrl || !effectiveContent.trim()) return;
    addImage(effectiveContent, previewUrl, options);
    setContent('');
    setPreviewUrl(null);
  }, [effectiveContent, previewUrl, options, addImage]);

  // 下载单个图片
  const handleDownloadSingle = useCallback(
    (id: string) => {
      const image = images.find(img => img.id === id);
      if (image) {
        downloadImage(image.dataUrl, createQRCodeFileName(image.content));
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

  const handleDownloadSvg = useCallback(async (id: string) => {
    const image = images.find(img => img.id === id);
    if (!image) return;

    const svg = await generateQRCodeSvg(image.content, image.options);
    if (!svg) return;

    const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = createQRCodeFileName(image.content).replace(/\.png$/, '.svg');
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  }, [images]);

  const handleLogoFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => setLogoDataUrl(String(reader.result || ''));
    reader.readAsDataURL(file);
  }, []);

  const handleTemplateValueChange = useCallback((key: string, value: string | boolean) => {
    setTemplateValues(prev => ({ ...prev, [key]: value }));
  }, []);

  const openPreview = useCallback((dataUrl: string, title: string, detail: string) => {
    setPreviewImage({ dataUrl, title, detail });
  }, []);

  const renderTemplateFields = () => {
    if (batchMode || templateId === 'text') {
      return (
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
      );
    }

    if (templateId === 'url') {
      return (
        <input
          value={String(templateValues.url ?? '')}
          onChange={e => handleTemplateValueChange('url', e.target.value)}
          placeholder="https://example.com"
          className="nb-input w-full text-sm"
        />
      );
    }

    if (templateId === 'wifi') {
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <input value={String(templateValues.ssid ?? '')} onChange={e => handleTemplateValueChange('ssid', e.target.value)} placeholder={t('tools.qrcodeGenerator.templateFields.ssid')} className="nb-input text-sm" />
          <input value={String(templateValues.password ?? '')} onChange={e => handleTemplateValueChange('password', e.target.value)} placeholder={t('tools.qrcodeGenerator.templateFields.password')} className="nb-input text-sm" />
          <select value={String(templateValues.encryption ?? 'WPA')} onChange={e => handleTemplateValueChange('encryption', e.target.value)} className="nb-input text-sm">
            <option value="WPA">WPA/WPA2</option>
            <option value="WEP">WEP</option>
            <option value="nopass">{t('tools.qrcodeGenerator.templateFields.noPassword')}</option>
          </select>
          <label className="flex items-center gap-2 text-sm nb-text-secondary">
            <input type="checkbox" checked={templateValues.hidden === true} onChange={e => handleTemplateValueChange('hidden', e.target.checked)} className="w-4 h-4 accent-[var(--nb-accent-yellow)]" />
            {t('tools.qrcodeGenerator.templateFields.hidden')}
          </label>
        </div>
      );
    }

    if (templateId === 'vcard') {
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <input value={String(templateValues.name ?? '')} onChange={e => handleTemplateValueChange('name', e.target.value)} placeholder={t('tools.qrcodeGenerator.templateFields.name')} className="nb-input text-sm" />
          <input value={String(templateValues.organization ?? '')} onChange={e => handleTemplateValueChange('organization', e.target.value)} placeholder={t('tools.qrcodeGenerator.templateFields.organization')} className="nb-input text-sm" />
          <input value={String(templateValues.phone ?? '')} onChange={e => handleTemplateValueChange('phone', e.target.value)} placeholder={t('tools.qrcodeGenerator.templateFields.phone')} className="nb-input text-sm" />
          <input value={String(templateValues.email ?? '')} onChange={e => handleTemplateValueChange('email', e.target.value)} placeholder={t('tools.qrcodeGenerator.templateFields.email')} className="nb-input text-sm" />
        </div>
      );
    }

    if (templateId === 'email') {
      return (
        <div className="grid grid-cols-1 gap-2">
          <input value={String(templateValues.email ?? '')} onChange={e => handleTemplateValueChange('email', e.target.value)} placeholder={t('tools.qrcodeGenerator.templateFields.email')} className="nb-input text-sm" />
          <input value={String(templateValues.subject ?? '')} onChange={e => handleTemplateValueChange('subject', e.target.value)} placeholder={t('tools.qrcodeGenerator.templateFields.subject')} className="nb-input text-sm" />
          <textarea value={String(templateValues.body ?? '')} onChange={e => handleTemplateValueChange('body', e.target.value)} placeholder={t('tools.qrcodeGenerator.templateFields.body')} rows={2} className="nb-input text-sm resize-none" />
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 gap-2">
        <input value={String(templateValues.phone ?? '')} onChange={e => handleTemplateValueChange('phone', e.target.value)} placeholder={t('tools.qrcodeGenerator.templateFields.phone')} className="nb-input text-sm" />
        <textarea value={String(templateValues.message ?? '')} onChange={e => handleTemplateValueChange('message', e.target.value)} placeholder={t('tools.qrcodeGenerator.templateFields.message')} rows={2} className="nb-input text-sm resize-none" />
      </div>
    );
  };

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
                  <div className="mb-2 flex items-center gap-2">
                    <select
                      value={templateId}
                      onChange={e => setTemplateId(e.target.value as QRCodeTemplateId)}
                      disabled={batchMode}
                      className="nb-input text-sm"
                    >
                      {QR_CODE_TEMPLATES.map(template => (
                        <option key={template.id} value={template.id}>{t(template.labelKey)}</option>
                      ))}
                    </select>
                  </div>
                  {renderTemplateFields()}
                  {!batchMode && templateId !== 'text' && effectiveContent && (
                    <p className="mt-2 text-xs nb-text-secondary break-all">{effectiveContent}</p>
                  )}
                </div>

                <BatchModeToggle enabled={batchMode} onChange={setBatchMode} />

                <div className="flex gap-2">
                  <button
                    onClick={handleGenerate}
                    disabled={!effectiveContent.trim() || isGenerating}
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

                <div className="nb-card-static p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium nb-text">{t('tools.qrcodeGenerator.logo')}</span>
                    <div className="flex gap-2">
                      <input
                        ref={logoInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={e => {
                          const file = e.target.files?.[0];
                          if (file) handleLogoFile(file);
                        }}
                      />
                      <button type="button" className="nb-btn nb-btn-secondary text-xs px-2 py-1" onClick={() => logoInputRef.current?.click()}>
                        {t('tools.qrcodeGenerator.selectLogo')}
                      </button>
                      {logoDataUrl && (
                        <button type="button" className="nb-btn nb-btn-ghost text-xs px-2 py-1" onClick={() => setLogoDataUrl('')}>
                          {t('common.clear')}
                        </button>
                      )}
                    </div>
                  </div>
                  {logoDataUrl && (
                    <img src={logoDataUrl} alt="" className="h-10 w-10 object-contain nb-border bg-white" />
                  )}
                </div>

                {/* 预览区（非批量模式） */}
                {!batchMode && (
                  <div className="flex items-center justify-center nb-card-static h-[200px] overflow-hidden">
                    {previewUrl ? (
                      <button
                        type="button"
                        className="cursor-zoom-in"
                        onClick={() => openPreview(previewUrl, t('tools.qrcodeGenerator.previewTitle'), effectiveContent)}
                        aria-label={t('tools.qrcodeGenerator.preview')}
                      >
                        <img
                          src={previewUrl}
                          alt="QR Code Preview"
                          className="max-w-[180px] max-h-[180px] object-contain"
                          style={{ imageRendering: 'pixelated' }}
                        />
                      </button>
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
              onDownloadSvg={handleDownloadSvg}
              onDownloadSelected={handleDownloadSelected}
              onPreview={openPreview}
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
              onPreview={openPreview}
            />
          </div>
        )}
      </div>
      <Modal
        isOpen={Boolean(previewImage)}
        onClose={() => setPreviewImage(null)}
        title={previewImage?.title ?? t('tools.qrcodeGenerator.preview')}
        widthClass="max-w-4xl"
      >
        {previewImage && (
          <div className="flex flex-col gap-3">
            <div className="flex h-[min(70dvh,680px)] items-center justify-center overflow-auto rounded-[var(--nb-border-radius-md)] nb-bg-card nb-border p-3">
              <img
                src={previewImage.dataUrl}
                alt={previewImage.title}
                className="max-h-full max-w-full object-contain"
                style={{ imageRendering: 'pixelated' }}
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
};
