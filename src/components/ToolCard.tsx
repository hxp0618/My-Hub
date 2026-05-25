import React from 'react';
import { ToolMetadata } from '../types/tools';

interface ToolCardProps {
  tool: ToolMetadata;
  isExpanded: boolean;
  onToggleExpand: () => void;
  children: React.ReactNode;
}

/**
 * 工具卡片容器组件 - 简洁版
 * 移除多余的装饰层级，让内容更清晰
 */
export const ToolCard: React.FC<ToolCardProps> = ({
  children,
}) => {
  // 简化结构：直接渲染内容，不添加额外的卡片层
  // ToolsPage 已经提供了外层卡片容器
  return (
    <div className="h-full flex flex-col">
      {children}
    </div>
  );
};
