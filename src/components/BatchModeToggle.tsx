import React from 'react';
import { useTranslation } from 'react-i18next';

/**
 * BatchModeToggle 组件属性
 */
export interface BatchModeToggleProps {
  /** 是否启用批量模式 */
  enabled: boolean;
  /** 状态变化回调 */
  onChange: (enabled: boolean) => void;
  /** 自定义类名 */
  className?: string;
}

/**
 * 批量模式切换组件
 * 
 * 用于切换工具的批量处理模式
 */
export const BatchModeToggle: React.FC<BatchModeToggleProps> = ({
  enabled,
  onChange,
  className = '',
}) => {
  const { t } = useTranslation();

  return (
    <label className={`flex items-center gap-2 cursor-pointer ${className}`}>
      <div className="relative nb-toggle">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only peer"
        />
        <div className={`nb-toggle-track ${enabled ? 'active' : ''}`}>
          <div className="nb-toggle-thumb" />
        </div>
      </div>
      <span className="text-sm nb-text-secondary">
        {t('tools.common.batchMode')}
      </span>
    </label>
  );
};

export default BatchModeToggle;
