import React from 'react';
import { useTranslation } from 'react-i18next';
import { ToolMetadata } from '../types/tools';

interface ToolCardProps {
  tool: ToolMetadata;
  isExpanded: boolean;
  onToggleExpand: () => void;
  children: React.ReactNode;
}

/**
 * 工具卡片容器组件
 * 提供统一的卡片样式和展开/折叠功能
 */
export const ToolCard: React.FC<ToolCardProps> = ({
  tool,
  isExpanded,
  onToggleExpand,
  children,
}) => {
  const { t } = useTranslation();

  return (
    <div className="h-full flex flex-col">
      {/* 工具头部 */}
      <div className="flex-shrink-0 px-8 py-6 nb-border-b nb-bg">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-3xl text-accent">{tool.icon}</span>
          <div>
            <h2 className="text-2xl font-bold nb-text">{t(tool.nameKey)}</h2>
            <p className="text-sm nb-text-secondary mt-1">{t(tool.descriptionKey)}</p>
          </div>
        </div>
      </div>

      {/* 工具内容区 - 占据剩余空间 */}
      <div className="flex-1 overflow-y-auto p-8 nb-bg">
        {children}
      </div>
    </div>
  );
};
