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
  onDownloadSelected: () => void;
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
  onDownloadSelected,
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
            className={`relative group rounded-none border-2 transition-colors ${
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
              onClick={() => onDelete(image.id)}
              className="absolute top-2 right-2 z-10 w-7 h-7 rounded-full bg-[color:var(--nb-accent-pink)] border-2 border-[color:var(--nb-border)] text-[color:var(--nb-border)] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center shadow-[2px_2px_0px_0px_var(--nb-border)]"
            >
              <span className="material-symbols-outlined text-sm">close</span>
            </button>

            {/* 图片 */}
            <div
              className="p-2 cursor-pointer"
              onClick={() => onSelect(image.id)}
            >
              <img
                src={image.dataUrl}
                alt={image.content}
                className="w-full aspect-square object-contain"
                style={{ imageRendering: 'pixelated' }}
              />
            </div>

            {/* 内容预览 */}
            <div className="px-2 pb-2">
              <p className="text-xs nb-text-secondary truncate" title={image.content}>
                {image.content}
              </p>
            </div>

            {/* 下载按钮 */}
            <button
              onClick={() => onDownload(image.id)}
              className="absolute bottom-2 right-2 z-10 w-7 h-7 rounded-full bg-[color:var(--nb-accent-blue)] border-2 border-[color:var(--nb-border)] text-[color:var(--nb-border)] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center shadow-[2px_2px_0px_0px_var(--nb-border)]"
            >
              <span className="material-symbols-outlined text-sm">download</span>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
