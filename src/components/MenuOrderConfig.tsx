import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useMenuOrder } from '../hooks/useMenuOrder';
import { useMenuCustomization } from '../hooks/useMenuCustomization';
import { MENU_ITEMS, MenuItemId, AVAILABLE_ICONS } from '../types/menu';
import { useToast } from '../hooks/useToast';

interface MenuOrderConfigProps {
  onReset?: () => void;
}

export const MenuOrderConfig: React.FC<MenuOrderConfigProps> = ({ onReset }) => {
  const { t } = useTranslation();
  const { menuOrder, moveItem, resetMenuOrder } = useMenuOrder();
  const { resetCustomization, getItemIcon, setItemIcon } = useMenuCustomization();
  const { showToast } = useToast();
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [showIconPicker, setShowIconPicker] = useState<MenuItemId | null>(null);

  const handleDragStart = useCallback((e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOverIndex(null);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent, toIndex: number) => {
      e.preventDefault();
      const fromIndex = parseInt(e.dataTransfer.getData('text/plain'), 10);

      if (!isNaN(fromIndex) && fromIndex !== toIndex) {
        moveItem(fromIndex, toIndex);
      }

      setDraggedIndex(null);
      setDragOverIndex(null);
    },
    [moveItem]
  );

  const handleDragEnd = useCallback(() => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  }, []);

  const handleReset = useCallback(() => {
    resetMenuOrder();
    resetCustomization();
    showToast(t('settings.menuOrderResetSuccess'), 'success');
    onReset?.();
  }, [resetMenuOrder, resetCustomization, showToast, t, onReset]);

  const handleIconClick = useCallback(
    (itemId: MenuItemId) => {
      setShowIconPicker(showIconPicker === itemId ? null : itemId);
    },
    [showIconPicker]
  );

  const handleSelectIcon = useCallback(
    (itemId: MenuItemId, icon: string) => {
      const defaultIcon = MENU_ITEMS[itemId].icon;
      setItemIcon(itemId, icon === defaultIcon ? undefined : icon);
      setShowIconPicker(null);
    },
    [setItemIcon]
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold nb-text">{t('settings.menuOrder')}</h3>
          <p className="text-sm nb-text-secondary">{t('settings.menuOrderDesc')}</p>
        </div>
        <button
          onClick={handleReset}
          className="nb-btn nb-btn-secondary px-3 py-1.5 text-sm"
        >
          {t('settings.resetMenuOrder')}
        </button>
      </div>

      <div className="space-y-2">
        {menuOrder.map((itemId, index) => {
          const item = MENU_ITEMS[itemId];
          const isDragging = draggedIndex === index;
          const isDragOver = dragOverIndex === index;
          const displayIcon = getItemIcon(itemId, item.icon);
          const isIconPickerOpen = showIconPicker === itemId;

          return (
            <div key={itemId} className="relative">
              <div
                draggable={!isIconPickerOpen}
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
                className={`
                  flex items-center gap-3 p-3 rounded-lg
                  border-[length:var(--nb-border-width)] border-[color:var(--nb-border)]
                  transition-all duration-150 nb-bg-card
                  ${isDragging ? 'opacity-50 border-dashed cursor-move' : ''}
                  ${isDragOver ? 'border-[color:var(--nb-accent-yellow)] bg-[color:var(--nb-accent-yellow)]/10' : ''}
                  ${!isIconPickerOpen ? 'cursor-move hover:shadow-[var(--nb-shadow-hover)]' : ''}
                `}
              >
                <span className="material-symbols-outlined icon-linear nb-text-secondary">drag_indicator</span>

                {/* 图标按钮 */}
                <button
                  onClick={() => handleIconClick(itemId)}
                  className={`p-1 rounded-lg border-[length:var(--nb-border-width)] border-[color:var(--nb-border)] hover:bg-[color:var(--nb-bg)] transition ${isIconPickerOpen ? 'bg-[color:var(--nb-accent-yellow)]/20' : ''}`}
                  title={t('settings.changeIcon')}
                >
                  <span className="material-symbols-outlined icon-linear nb-text">{displayIcon}</span>
                </button>

                <span className="nb-text flex-1">{t(item.labelKey)}</span>
                <span className="text-xs nb-text-secondary">{index + 1}</span>
              </div>

              {/* 图标选择器 */}
              {isIconPickerOpen && (
                <div className="absolute left-0 right-0 mt-1 p-3 nb-card-static z-10">
                  <div className="grid grid-cols-6 gap-2">
                    {AVAILABLE_ICONS.map((icon) => (
                      <button
                        key={icon}
                        onClick={() => handleSelectIcon(itemId, icon)}
                        className={`p-2 rounded-lg border-[length:var(--nb-border-width)] border-[color:var(--nb-border)] hover:bg-[color:var(--nb-bg)] transition ${
                          displayIcon === icon ? 'bg-[color:var(--nb-accent-yellow)]/20 border-[color:var(--nb-accent-yellow)]' : ''
                        }`}
                        title={icon}
                      >
                        <span className="material-symbols-outlined icon-linear nb-text">{icon}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-xs nb-text-secondary">{t('settings.menuOrderHint')}</p>
    </div>
  );
};

export default MenuOrderConfig;
