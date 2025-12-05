/**
 * 密钥列表组件
 * 显示所有 Bark 密钥配置并提供操作按钮
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { KeyListProps } from '../../../../../types/bark';
import { maskDeviceKey } from '../../../../../utils/barkKeyManager';

export const KeyList: React.FC<KeyListProps> = ({
  keys,
  selectedKeyId,
  onEdit,
  onDelete,
  onTest,
  onSelect,
  isTesting = false,
  testingKeyId = null,
}) => {
  const { t } = useTranslation();

  // 如果没有密钥，显示空状态
  if (keys.length === 0) {
    return (
      <div className="nb-card-static flex flex-col items-center justify-center py-10 text-center animate-fade-in-up">
        <div className="p-3 rounded-full nb-border nb-shadow mb-3 bg-[color:var(--nb-card)]">
          <span className="material-symbols-outlined text-3xl text-[color:var(--nb-accent-blue)]">key_vertical</span>
        </div>
        <p className="text-sm font-medium nb-text">{t('tools.barkNotifier.keys.emptyState')}</p>
        <p className="text-xs nb-text-secondary mt-1">{t('tools.barkNotifier.keys.emptyStateHint')}</p>
      </div>
    );
  }

  // 按创建时间倒序排列（最新的在前）
  const sortedKeys = [...keys].sort((a, b) => b.createdAt - a.createdAt);

  return (
    <div className="space-y-2">
      {sortedKeys.map((key) => {
        const isSelected = key.id === selectedKeyId;
        const isCurrentTesting = testingKeyId === key.id && isTesting;
        
        return (
          <div
            key={key.id}
            className={`nb-card-static p-3 transition-theme ${
              isSelected ? 'nb-selected' : 'hover:shadow-[var(--nb-shadow-hover)] hover:-translate-y-[1px]'
            }`}
            style={isSelected ? { borderColor: 'var(--nb-accent-yellow)' } : undefined}
          >
            <div className="flex items-start justify-between gap-3">
              {/* 左侧：配置信息 */}
              <div 
                className="flex-1 min-w-0 cursor-pointer"
                onClick={() => onSelect(key.id)}
              >
                <div className="flex items-center gap-2 mb-1">
                  {/* 选中标识 */}
                  <span
                    className={`w-2.5 h-2.5 rounded-full nb-border ${
                      isSelected ? 'bg-[color:var(--nb-accent-yellow)]' : 'bg-[color:var(--nb-card)]'
                    }`}
                  />
                  
                  {/* 备注 */}
                  <span className="font-semibold text-sm nb-text truncate">
                    {key.label}
                  </span>
                </div>
                
                {/* 设备密钥和服务器 */}
                <div className="flex items-center gap-2 text-xs nb-text-secondary ml-5 flex-wrap">
                  <span className="px-2 py-0.5 rounded-full nb-border nb-bg">
                    {maskDeviceKey(key.deviceKey)}
                  </span>
                  <span className="flex items-center gap-1 nb-text-secondary">
                    <span className="material-symbols-outlined text-xs">dns</span>
                    <span className="truncate max-w-[220px]">{key.server}</span>
                  </span>
                </div>
              </div>

              {/* 右侧：操作按钮 */}
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => onEdit(key)}
                  className="nb-btn nb-btn-ghost p-1.5 rounded transition-theme"
                  title={t('tools.barkNotifier.keys.edit')}
                >
                  <span className="material-symbols-outlined text-sm">edit</span>
                </button>
                
                <button
                  onClick={() => onTest(key.id)}
                  disabled={isTesting}
                  className="nb-btn nb-btn-ghost p-1.5 rounded transition-theme disabled:opacity-50 disabled:cursor-not-allowed"
                  title={t('tools.barkNotifier.keys.test')}
                >
                  {isCurrentTesting ? (
                    <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
                  ) : (
                    <span className="material-symbols-outlined text-sm">send</span>
                  )}
                </button>
                
                <button
                  onClick={() => onDelete(key.id)}
                  className="nb-btn nb-btn-ghost p-1.5 rounded transition-theme text-[color:var(--nb-accent-pink)]"
                  title={t('tools.barkNotifier.keys.delete')}
                >
                  <span className="material-symbols-outlined text-sm">delete</span>
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
