/**
 * 密钥表单组件
 * 用于添加或编辑 Bark 密钥配置
 * Neo-Brutalism 风格适配
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyFormProps } from '../../../../../types/bark';
import { validateDeviceKey, validateLabel, validateServer } from '../../../../../utils/barkKeyManager';

export const KeyForm: React.FC<KeyFormProps> = ({
  mode,
  initialData,
  onSubmit,
  onCancel,
}) => {
  const { t } = useTranslation();
  
  const [label, setLabel] = useState('');
  const [deviceKey, setDeviceKey] = useState('');
  const [server, setServer] = useState('https://api.day.app');
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // 初始化表单数据
  useEffect(() => {
    if (mode === 'edit' && initialData) {
      setLabel(initialData.label);
      setDeviceKey(initialData.deviceKey);
      setServer(initialData.server);
    } else if (mode === 'add') {
      setLabel('');
      setDeviceKey('');
      setServer('https://api.day.app');
    }
  }, [mode, initialData]);

  // 验证表单
  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    // 验证设备密钥
    const deviceKeyValidation = validateDeviceKey(deviceKey);
    if (!deviceKeyValidation.valid && deviceKeyValidation.error) {
      newErrors.deviceKey = t(`tools.barkNotifier.keys.${deviceKeyValidation.error}`);
    }

    // 验证备注
    const labelValidation = validateLabel(label);
    if (!labelValidation.valid && labelValidation.error) {
      newErrors.label = t(`tools.barkNotifier.keys.${labelValidation.error}`);
    }

    // 验证服务器地址
    const serverValidation = validateServer(server);
    if (!serverValidation.valid && serverValidation.error) {
      newErrors.server = t(`tools.barkNotifier.keys.${serverValidation.error}`);
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 处理提交
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateForm()) {
      onSubmit({
        label: label.trim(),
        deviceKey: deviceKey.trim(),
        server: server.trim() || 'https://api.day.app',
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* 备注 */}
      <div>
        <label className="block text-sm font-bold nb-text mb-1.5">
          {t('tools.barkNotifier.keys.label')} <span style={{ color: 'var(--nb-accent-pink)' }}>*</span>
        </label>
        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder={t('tools.barkNotifier.keys.labelPlaceholder')}
          maxLength={50}
          className={`nb-input w-full text-sm ${
            errors.label ? 'border-[color:var(--nb-accent-pink)]' : ''
          }`}
        />
        <div className="flex items-center justify-between mt-1.5">
          <span className="text-xs nb-text-secondary">
            {t('tools.barkNotifier.keys.labelHint', { current: label.length })}
          </span>
          {errors.label && (
            <span className="text-xs font-medium" style={{ color: 'var(--nb-accent-pink)' }}>{errors.label}</span>
          )}
        </div>
      </div>

      {/* 设备密钥 */}
      <div>
        <label className="block text-sm font-bold nb-text mb-1.5">
          {t('tools.barkNotifier.keys.deviceKey')} <span style={{ color: 'var(--nb-accent-pink)' }}>*</span>
        </label>
        <input
          type="text"
          value={deviceKey}
          onChange={(e) => setDeviceKey(e.target.value)}
          placeholder={t('tools.barkNotifier.deviceKeyPlaceholder')}
          className={`nb-input w-full text-sm ${
            errors.deviceKey ? 'border-[color:var(--nb-accent-pink)]' : ''
          }`}
        />
        {errors.deviceKey && (
          <span className="text-xs font-medium mt-1.5 block" style={{ color: 'var(--nb-accent-pink)' }}>{errors.deviceKey}</span>
        )}
      </div>

      {/* 服务器地址 */}
      <div>
        <label className="block text-sm font-bold nb-text mb-1.5">
          {t('tools.barkNotifier.keys.server')}
        </label>
        <input
          type="text"
          value={server}
          onChange={(e) => setServer(e.target.value)}
          placeholder={t('tools.barkNotifier.keys.serverPlaceholder')}
          className={`nb-input w-full text-sm ${
            errors.server ? 'border-[color:var(--nb-accent-pink)]' : ''
          }`}
        />
        {errors.server && (
          <span className="text-xs font-medium mt-1.5 block" style={{ color: 'var(--nb-accent-pink)' }}>{errors.server}</span>
        )}
      </div>

      {/* 按钮 - Neo-Brutalism 风格 */}
      <div className="flex items-center justify-end gap-3 pt-3">
        <button
          type="button"
          onClick={onCancel}
          className="nb-btn nb-btn-secondary px-4 py-2 text-sm"
        >
          {t('common.cancel')}
        </button>
        <button
          type="submit"
          className="nb-btn nb-btn-primary px-4 py-2 text-sm"
        >
          {t('common.save')}
        </button>
      </div>
    </form>
  );
};
