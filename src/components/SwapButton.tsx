import React from 'react';
import { useTranslation } from 'react-i18next';

/**
 * SwapButton 组件属性
 */
export interface SwapButtonProps {
  /** 是否禁用 */
  disabled?: boolean;
  /** 点击回调 */
  onClick: () => void;
  /** 自定义类名 */
  className?: string;
  /** 按钮大小 */
  size?: 'sm' | 'md' | 'lg';
}

/**
 * 交换按钮组件
 * 
 * 用于交换输入和输出内容
 */
export const SwapButton: React.FC<SwapButtonProps> = ({
  disabled = false,
  onClick,
  className = '',
  size = 'md',
}) => {
  const { t } = useTranslation();

  const sizeClasses = {
    sm: 'p-1.5',
    md: 'p-2',
    lg: 'p-2.5',
  };

  const iconSizes = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        nb-btn nb-btn-secondary
        ${sizeClasses[size]}
        disabled:opacity-50 disabled:cursor-not-allowed
        ${className}
      `}
      title={t('tools.common.swap')}
    >
      <span className={`material-symbols-outlined ${iconSizes[size]}`}>
        swap_horiz
      </span>
    </button>
  );
};

export default SwapButton;
