import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useClickOutside } from '../../../hooks/useClickOutside';
import { getTagClassName } from '../../../utils/tagColorUtils';

export interface ItemCardAction {
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
  actions?: ItemCardAction[];      // 操作菜单项

  // 标签生成失败状态
  hasTagGenerationFailure?: boolean;
  tagGenerationFailureReason?: string;

  // 交互状态
  isMultiSelectMode?: boolean;
  isSelected?: boolean;
  onSelect?: () => void;

  // 拖拽相关
  isDraggable?: boolean;
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
  dragProps?: React.HTMLAttributes<HTMLDivElement>;
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
  dragProps,
  isDragging = false,
}) => {
  const { t } = useTranslation();
  const [showActions, setShowActions] = useState(false);
  const [showFailureTooltip, setShowFailureTooltip] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  useClickOutside(dropdownRef, () => setShowActions(false));

  const cardLabel = isMultiSelectMode
    ? t('itemCard.select', { title })
    : t('itemCard.open', { title });

  const activateCard = () => {
    if (isMultiSelectMode) {
      onSelect?.();
    } else {
      window.open(href, '_blank', 'noopener,noreferrer');
    }
  };

  const handleWrapperClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // 避免菜单、复选框和拖拽手柄触发卡片打开。
    if (
        dropdownRef.current?.contains(e.target as Node) ||
        (e.target as HTMLElement).closest('button') ||
        (e.target as HTMLElement).closest('input') ||
        (e.target as HTMLElement).closest('.drag-handle')
    ) {
        return;
    }

    activateCard();
  };

  const handleWrapperKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) {
      return;
    }

    if (event.key === 'Enter' || (isMultiSelectMode && event.key === ' ')) {
      event.preventDefault();
      activateCard();
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
        type="button"
        onClick={e => {
          e.stopPropagation();
          setShowActions(!showActions);
        }}
        className={`item-card-action-trigger ${isMultiSelectMode ? 'is-hidden' : ''}`}
        disabled={isMultiSelectMode}
        aria-label={t('itemCard.moreActions', { title })}
        aria-haspopup="menu"
        aria-expanded={showActions}
      >
        <span className="material-symbols-outlined icon-linear text-lg" aria-hidden="true">more_vert</span>
      </button>
      {showActions && (
        <div ref={dropdownRef} className="item-card-menu nb-dropdown" role="menu">
          <div className="py-1">
            {actions.map(action => (
              <button
                key={action.label}
                type="button"
                onClick={e => {
                  e.stopPropagation();
                  action.onClick();
                  setShowActions(false);
                }}
                className="nb-dropdown-item item-card-menu-item"
                role="menuitem"
              >
                <span className="material-symbols-outlined icon-linear text-lg" aria-hidden="true">{action.icon}</span>
                {action.label}
              </button>
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
      onKeyDown={handleWrapperKeyDown}
      {...dragProps}
      className={`item-card nb-card-data ${isMultiSelectMode ? 'item-card--selectable' : ''} ${isSelected ? 'nb-selected' : ''} ${
        isDragging ? 'opacity-50 scale-105' : ''
      } ${showActions ? 'z-30' : ''}`}
      role={isMultiSelectMode ? 'button' : 'link'}
      aria-pressed={isMultiSelectMode ? isSelected : undefined}
      aria-label={cardLabel}
      tabIndex={0}
    >
      {isMultiSelectMode && (
        <div className="item-card-selection" onClick={e => e.stopPropagation()}>
           <input
            type="checkbox"
            checked={isSelected}
            onChange={onSelect}
            aria-hidden="true"
            tabIndex={-1}
            className="item-card-checkbox"
          />
        </div>
      )}

      {/* -- Drag Handle -- */}
      {isDraggable && !isMultiSelectMode && (
        <div
          className="drag-handle item-card-drag-handle"
          {...dragHandleProps}
          aria-label={dragHandleProps?.['aria-label'] ?? t('itemCard.dragHandle', { title })}
          onClick={e => e.stopPropagation()}
        >
          <span className="material-symbols-outlined icon-linear text-lg" aria-hidden="true">
            drag_indicator
          </span>
        </div>
      )}

      {/* -- Header -- */}
      <div className={`flex items-start ${isMultiSelectMode ? 'pl-8' : ''} ${isDraggable && !isMultiSelectMode ? 'pl-8' : ''}`}>
        <div className="item-card-favicon">
          <img alt={`${title} favicon`} className="w-full h-full object-cover" src={faviconUrl} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-bold nb-text text-base leading-tight line-clamp-2 flex-1" title={title}>
              {title}
            </h3>
            {hasTagGenerationFailure && (
              <div
                className="relative flex-shrink-0"
                onMouseEnter={() => setShowFailureTooltip(true)}
                onMouseLeave={() => setShowFailureTooltip(false)}
              >
                <span className="material-symbols-outlined text-error text-base" aria-hidden="true">warning</span>
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
          <p className="text-xs nb-text-secondary truncate mt-1.5 font-medium">{hostname}</p>
        </div>
      </div>

      {actionMenu}

      {/* -- Tags -- */}
      {tags && tags.length > 0 && (
          <div className={`flex items-center flex-wrap gap-2 text-xs mt-4 ${isMultiSelectMode ? 'pl-8' : ''} ${isDraggable && !isMultiSelectMode ? 'pl-8' : ''}`}>
              {tags.map((tag, index) => (
                  <span key={tag} className={`${getTagClassName(index)} font-bold uppercase tracking-wide shadow-[var(--nb-shadow-sm)] hover:shadow-[var(--nb-shadow-xs)] hover:translate-x-[1px] hover:translate-y-[1px] transition-all duration-100`}>
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
