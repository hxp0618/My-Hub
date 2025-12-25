import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useClickOutside } from '../../../hooks/useClickOutside';
import { getTagClassName } from '../../../utils/tagColorUtils';

interface Action {
  label: string;
  icon: string;
  onClick: () => void;
}

interface ItemCardProps {
  // 核心数据
  href: string;
  title: string;
  hostname: string;
  faviconUrl: string;
  type?: 'history' | 'bookmark';

  // 扩展元数据 (替代旧的 badges)
  timeLabel?: string;      // 格式化后的时间字符串，如 "2小时前"
  visitCount?: number;     // 访问次数
  device?: string;         // 设备名称，如 "Laptop"

  // 功能模块
  tags?: string[];         // 书签标签
  actions?: Action[];      // 操作菜单项

  // 标签生成失败状态
  hasTagGenerationFailure?: boolean;
  tagGenerationFailureReason?: string;

  // 交互状态
  isMultiSelectMode?: boolean;
  isSelected?: boolean;
  onSelect?: () => void;

  // 拖拽相关
  isDraggable?: boolean;
  dragHandleProps?: any;
  isDragging?: boolean;
}

export const ItemCard: React.FC<ItemCardProps> = ({
  href,
  title,
  hostname,
  faviconUrl,
  tags,
  timeLabel,
  visitCount,
  device,
  actions,
  hasTagGenerationFailure = false,
  tagGenerationFailureReason,
  isMultiSelectMode = false,
  isSelected = false,
  onSelect,
  isDraggable = false,
  dragHandleProps,
  isDragging = false,
}) => {
  const { t } = useTranslation();
  const [showActions, setShowActions] = useState(false);
  const [showFailureTooltip, setShowFailureTooltip] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  useClickOutside(dropdownRef, () => setShowActions(false));

  const handleWrapperClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Don't navigate if clicking on an interactive element or drag handle
    if (
        dropdownRef.current?.contains(e.target as Node) ||
        (e.target as HTMLElement).closest('button') ||
        (e.target as HTMLElement).closest('.drag-handle')
    ) {
        return;
    }

    if (isMultiSelectMode) {
      onSelect?.();
    } else {
      window.open(href, '_blank', 'noopener,noreferrer');
    }
  };

  const metadataElements: React.JSX.Element[] = [];
  if (timeLabel) {
    metadataElements.push(
      <div key="time" className="flex items-center">
        {/* <span className="material-symbols-outlined icon-linear text-sm mr-1.5">schedule</span> */}
        <span>{timeLabel}</span>
      </div>
    );
  }
  if (visitCount !== undefined) {
    metadataElements.push(<span key="visits">{t('time.days', { count: visitCount })}</span>);
  }
  if (device) {
    metadataElements.push(<span key="device">{device}</span>);
  }

  const actionMenu = actions && (
    <div className="absolute top-2 right-2 z-10">
      <button
        onClick={e => {
          e.stopPropagation();
          setShowActions(!showActions);
        }}
        className={`p-2 rounded-full transition-opacity ${isMultiSelectMode ? 'opacity-0' : 'opacity-0 group-hover:opacity-100 hover:nb-bg-card'}`}
        disabled={isMultiSelectMode}
      >
        <span className="material-symbols-outlined icon-linear text-lg">more_vert</span>
      </button>
      {showActions && (
        <div ref={dropdownRef} className="nb-dropdown absolute right-0 mt-2 w-48 z-20">
          <div className="py-1">
            {actions.map(action => (
              <div
                key={action.label}
                onClick={e => {
                  e.stopPropagation();
                  action.onClick();
                  setShowActions(false);
                }}
                className="nb-dropdown-item flex items-center cursor-pointer"
              >
                <span className="material-symbols-outlined icon-linear text-lg mr-3">{action.icon}</span>
                {action.label}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div
      ref={wrapperRef}
      onClick={handleWrapperClick}
      className={`nb-card relative flex flex-col p-4 no-underline group min-h-[120px] ${
        isMultiSelectMode ? 'cursor-pointer' : 'cursor-pointer'
      } ${isSelected ? 'nb-selected' : ''} ${
        isDragging ? 'opacity-50 scale-105' : ''
      } ${showActions ? 'z-30' : ''}`}
    >
      {isMultiSelectMode && (
        <div className="absolute top-4 left-4 z-10" onClick={e => e.stopPropagation()}>
           <input
            type="checkbox"
            checked={isSelected}
            onChange={onSelect}
            className="h-5 w-5 nb-border rounded-md bg-[color:var(--nb-card)] text-[color:var(--nb-border)] accent-[color:var(--nb-border)] cursor-pointer focus:outline-none focus:ring-0"
          />
        </div>
      )}

      {/* -- Drag Handle -- */}
      {isDraggable && !isMultiSelectMode && (
        <div
          className="drag-handle absolute top-4 left-4 z-10 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
          {...dragHandleProps}
          onClick={e => e.stopPropagation()}
        >
          <span className="material-symbols-outlined icon-linear text-lg text-gray-400 hover:text-gray-600">
            drag_indicator
          </span>
        </div>
      )}

      {/* -- Header -- */}
      <div className={`flex items-start ${isMultiSelectMode ? 'pl-8' : ''} ${isDraggable && !isMultiSelectMode ? 'pl-8' : ''}`}>
        <img alt={`${title} favicon`} className="w-6 h-6 mr-3 mt-1 flex-shrink-0 avatar-flat" src={faviconUrl} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold nb-text text-sm leading-tight line-clamp-2 flex-1" title={title}>
              {title}
            </h3>
            {hasTagGenerationFailure && (
              <div
                className="relative flex-shrink-0"
                onMouseEnter={() => setShowFailureTooltip(true)}
                onMouseLeave={() => setShowFailureTooltip(false)}
              >
                <span className="material-symbols-outlined text-error text-base">warning</span>
                {showFailureTooltip && tagGenerationFailureReason && (
                  <div className="nb-card-static absolute left-1/2 bottom-full transform -translate-x-1/2 mb-2 px-3 py-2 text-xs whitespace-nowrap z-50 max-w-xs">
                    {t('bookmarks.tagGenerationFailed')}: {tagGenerationFailureReason}
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                      <div className="border-4 border-transparent" style={{ borderTopColor: 'var(--nb-border)' }}></div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          <p className="text-xs nb-text-secondary truncate mt-1">{hostname}</p>
        </div>
      </div>

      {actionMenu}

      {/* -- Tags -- */}
      {tags && tags.length > 0 && (
          <div className={`flex items-center flex-wrap gap-2 text-xs mt-3 ${isMultiSelectMode ? 'pl-8' : ''} ${isDraggable && !isMultiSelectMode ? 'pl-8' : ''}`}>
              {tags.map((tag, index) => (
                  <span key={tag} className={getTagClassName(index)}>
                      {tag}
                  </span>
              ))}
          </div>
      )}

      {/* -- Footer (Metadata) -- */}
      {metadataElements.length > 0 && (
        <div className={`flex items-center flex-wrap gap-y-1 text-xs nb-text-secondary mt-auto pt-3 ${isMultiSelectMode ? 'pl-8' : ''} ${isDraggable && !isMultiSelectMode ? 'pl-8' : ''}`}>
          {metadataElements.reduce<React.ReactNode[]>((acc, el, i) => {
            if (i > 0) {
              acc.push(<span key={`sep-${el.key}`} className="mx-1.5">·</span>);
            }
            acc.push(el);
            return acc;
          }, [])}
        </div>
      )}
    </div>
  );
};
