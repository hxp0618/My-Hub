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
      <div className="relative">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only peer"
        />
        <div className="w-9 h-5 bg-secondary rounded-full peer peer-checked:bg-accent transition-colors"></div>
        <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform peer-checked:translate-x-4"></div>
      </div>
      <span className="text-sm nb-text-secondary">
        {t('tools.common.batchMode')}
      </span>
    </label>
  );
};

export default BatchModeToggle;
