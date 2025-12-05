/**
 * 密钥选择器组件
 * 用于选择当前使用的 Bark 密钥配置（支持多选）
 * Neo-Brutalism 风格适配
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { BarkKeyConfig } from '../../../../../types/bark';
import { maskDeviceKey } from '../../../../../utils/barkKeyManager';

// 单选模式 Props
interface SingleSelectProps {
  keys: BarkKeyConfig[];
  selectedKeyId: string | null;
  onSelect: (keyId: string) => void;
  disabled?: boolean;
  multiSelect?: false;
  selectedKeyIds?: never;
  onMultiSelect?: never;
}

// 多选模式 Props
interface MultiSelectProps {
  keys: BarkKeyConfig[];
  selectedKeyIds: string[];
  onMultiSelect: (keyIds: string[]) => void;
  disabled?: boolean;
  multiSelect: true;
  selectedKeyId?: never;
  onSelect?: never;
}

export type KeySelectorProps = SingleSelectProps | MultiSelectProps;

export const KeySelector: React.FC<KeySelectorProps> = (props) => {
  const { keys, disabled = false, multiSelect } = props;
  const { t } = useTranslation();

  // 如果没有密钥，显示提示 - Neo-Brutalism 风格
  if (keys.length === 0) {
    return (
      <div
        className="text-sm nb-text-secondary nb-border rounded-lg px-3 py-2"
        style={{
          borderStyle: 'dashed',
          backgroundColor: 'var(--nb-bg)',
        }}
      >
        {t('tools.barkNotifier.keys.noKeysAvailable')}
      </div>
    );
  }

  // 多选模式
  if (multiSelect) {
    const { selectedKeyIds, onMultiSelect } = props as MultiSelectProps;

    const handleToggle = (keyId: string) => {
      if (disabled) return;
      if (selectedKeyIds.includes(keyId)) {
        onMultiSelect(selectedKeyIds.filter((id) => id !== keyId));
      } else {
        onMultiSelect([...selectedKeyIds, keyId]);
      }
    };

    const handleSelectAll = () => {
      if (disabled) return;
      if (selectedKeyIds.length === keys.length) {
        onMultiSelect([]);
      } else {
        onMultiSelect(keys.map((k) => k.id));
      }
    };

    return (
      <div className="w-full">
        <div className="flex items-center justify-between mb-1.5">
          <label className="block text-xs font-bold nb-text-secondary">
            {t('tools.barkNotifier.keys.selectMultiple')}
          </label>
          <button
            type="button"
            onClick={handleSelectAll}
            disabled={disabled}
            className="text-xs nb-text-secondary hover:nb-text transition-colors disabled:opacity-50"
          >
            {selectedKeyIds.length === keys.length
              ? t('tools.barkNotifier.keys.deselectAll')
              : t('tools.barkNotifier.keys.selectAll')}
          </button>
        </div>
        <div
          className={`nb-card-static p-2 max-h-32 overflow-y-auto ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
        >
          <div className="space-y-1">
            {keys.map((key) => {
              const isSelected = selectedKeyIds.includes(key.id);
              return (
                <label
                  key={key.id}
                  className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-all ${
                    isSelected
                      ? 'nb-bg'
                      : 'hover:nb-bg'
                  } ${disabled ? 'cursor-not-allowed' : ''}`}
                  style={isSelected ? { backgroundColor: 'var(--nb-accent-yellow)', opacity: 0.8 } : undefined}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleToggle(key.id)}
                    disabled={disabled}
                    className="sr-only"
                  />
                  <span
                    className={`w-4 h-4 rounded nb-border flex items-center justify-center flex-shrink-0 ${
                      isSelected ? 'bg-[color:var(--nb-accent-yellow)]' : 'bg-[color:var(--nb-card)]'
                    }`}
                  >
                    {isSelected && (
                      <span className="material-symbols-outlined text-xs nb-text">check</span>
                    )}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="text-sm nb-text font-medium truncate block">{key.label}</span>
                    <span className="text-xs nb-text-secondary truncate block">
                      {maskDeviceKey(key.deviceKey)}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
        </div>
        {selectedKeyIds.length > 0 && (
          <div className="mt-2 text-xs nb-text-secondary flex items-center gap-1">
            <span className="material-symbols-outlined text-xs" style={{ color: 'var(--nb-accent-green)' }}>
              check_circle
            </span>
            <span>
              {t('tools.barkNotifier.keys.selectedCount', { count: selectedKeyIds.length })}
            </span>
          </div>
        )}
      </div>
    );
  }

  // 单选模式（保持向后兼容）
  const { selectedKeyId, onSelect } = props as SingleSelectProps;
  const selectedKey = keys.find((k) => k.id === selectedKeyId);

  return (
    <div className="w-full">
      <label className="block text-xs font-bold nb-text-secondary mb-1.5">
        {t('tools.barkNotifier.keys.select')}
      </label>
      <div
        className={`nb-card-static flex items-center gap-3 px-3 py-2 ${
          disabled ? 'opacity-60 cursor-not-allowed' : ''
        }`}
      >
        <span className="material-symbols-outlined text-lg" style={{ color: 'var(--nb-accent-blue)' }}>
          vpn_key
        </span>
        <select
          value={selectedKeyId || ''}
          onChange={(e) => onSelect(e.target.value)}
          disabled={disabled}
          className="flex-1 bg-transparent text-sm nb-text focus:outline-none focus:ring-0 border-none cursor-pointer"
        >
          {keys.map((key) => (
            <option key={key.id} value={key.id}>
              {key.label} ({maskDeviceKey(key.deviceKey)})
            </option>
          ))}
        </select>
      </div>

      {selectedKey && (
        <div className="mt-2 text-xs nb-text-secondary flex items-center gap-1">
          <span className="material-symbols-outlined text-xs">dns</span>
          <span className="truncate">{selectedKey.server}</span>
        </div>
      )}
    </div>
  );
};
