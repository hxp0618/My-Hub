import React from 'react';
import { useTranslation } from 'react-i18next';
import type { QRCodeImage } from '../../../../../types/qrcode';

interface QRCodeImageListProps {
  images: QRCodeImage[];
  onSelect: (id: string) => void;
  onSelectAll: (selected: boolean) => void;
  onDelete: (id: string) => void;
  onDeleteSelected: () => void;
  onDownload: (id: string) => void;
  onDownloadSvg: (id: string) => void;
  onDownloadSelected: () => void;
  onPreview: (dataUrl: string, title: string, detail: string) => void;
  hasSelected: boolean;
  allSelected: boolean;
}

export const QRCodeImageList: React.FC<QRCodeImageListProps> = ({
  images,
  onSelect,
  onSelectAll,
  onDelete,
  onDeleteSelected,
  onDownload,
  onDownloadSvg,
  onDownloadSelected,
  onPreview,
  hasSelected,
  allSelected,
}) => {
  const { t } = useTranslation();

  if (images.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {/* 标题和操作栏 */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium nb-text">
          {t('tools.qrcodeGenerator.generatedImages')} ({images.length})
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onSelectAll(!allSelected)}
            className="nb-btn nb-btn-secondary text-xs px-3 py-1"
          >
            {allSelected ? t('common.cancel') : t('tools.qrcodeGenerator.selectAll')}
          </button>
          {hasSelected && (
            <>
              <button
                onClick={onDeleteSelected}
                className="nb-btn nb-btn-danger text-xs px-3 py-1"
              >
                {t('common.delete')}
              </button>
              <button
                onClick={onDownloadSelected}
                className="nb-btn nb-btn-primary text-xs px-3 py-1"
              >
                {t('tools.qrcodeGenerator.downloadZip')}
              </button>
            </>
          )}
        </div>
      </div>

      {/* 图片网格 */}
      <div className="grid grid-cols-4 gap-3">
        {images.map(image => (
          <div
            key={image.id}
            className={`relative group rounded-md border-2 transition-colors ${
              image.selected
                ? 'border-[color:var(--nb-border)] bg-[color:var(--nb-accent-yellow)]'
                : 'border-[color:var(--nb-border)] nb-bg-card'
            }`}
          >
            {/* 选择框 */}
            <div className="absolute top-2 left-2 z-10">
              <input
                type="checkbox"
                checked={image.selected}
                onChange={() => onSelect(image.id)}
                className="w-4 h-4 border-2 border-[color:var(--nb-border)] bg-[color:var(--nb-card)] accent-[color:var(--nb-border)] cursor-pointer"
              />
            </div>

            {/* 删除按钮 */}
            <button
              type="button"
              onClick={() => onDelete(image.id)}
              className={`absolute top-2 right-2 z-10 w-11 h-11 rounded-full bg-[color:var(--nb-accent-pink)] border-2 border-[color:var(--nb-border)] text-[color:var(--nb-text-on-accent)] transition-opacity flex items-center justify-center shadow-[var(--nb-shadow-sm)] ${
                image.selected ? 'opacity-100' : 'opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus-visible:opacity-100'
              }`}
              aria-label={t('common.delete')}
            >
              <span className="material-symbols-outlined text-sm" aria-hidden="true">close</span>
            </button>

            {/* 图片 */}
            <button
              type="button"
              className="block w-full p-2 cursor-zoom-in"
              onClick={() => onPreview(
                image.dataUrl,
                t('tools.qrcodeGenerator.previewTitle'),
                image.content,
              )}
              aria-label={t('tools.qrcodeGenerator.preview')}
            >
              <img
                src={image.dataUrl}
                alt={image.content}
                className="w-full aspect-square object-contain"
                style={{ imageRendering: 'pixelated' }}
              />
              <span className="absolute bottom-2 left-2 z-10 w-11 h-11 rounded-full bg-[color:var(--nb-accent-yellow)] border-2 border-[color:var(--nb-border)] text-[color:var(--nb-text-on-accent)] opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus-visible:opacity-100 transition-opacity flex items-center justify-center shadow-[var(--nb-shadow-sm)]" aria-hidden="true">
                <span className="material-symbols-outlined text-sm">zoom_in</span>
              </span>
            </button>

            {/* 内容预览 */}
            <div className="px-2 pb-2">
              <p className="text-xs nb-text-secondary truncate" title={image.content}>
                {image.content}
              </p>
            </div>

            {/* 下载按钮 */}
            <button
              type="button"
              onClick={() => onDownload(image.id)}
              className={`absolute bottom-2 right-2 z-10 w-11 h-11 rounded-full bg-[color:var(--nb-accent-blue)] border-2 border-[color:var(--nb-border)] text-[color:var(--nb-text-on-accent)] transition-opacity flex items-center justify-center shadow-[var(--nb-shadow-sm)] ${
                image.selected ? 'opacity-100' : 'opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus-visible:opacity-100'
              }`}
              aria-label={t('tools.qrcodeGenerator.download')}
            >
              <span className="material-symbols-outlined text-sm" aria-hidden="true">download</span>
            </button>
            <button
              type="button"
              onClick={() => onDownloadSvg(image.id)}
              className={`absolute bottom-2 right-14 z-10 w-11 h-11 rounded-full bg-[color:var(--nb-accent-green)] border-2 border-[color:var(--nb-border)] text-[color:var(--nb-text-on-accent)] transition-opacity flex items-center justify-center shadow-[var(--nb-shadow-sm)] ${
                image.selected ? 'opacity-100' : 'opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus-visible:opacity-100'
              }`}
              aria-label={t('tools.qrcodeGenerator.downloadSvg')}
            >
              <span className="material-symbols-outlined text-sm" aria-hidden="true">code</span>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
