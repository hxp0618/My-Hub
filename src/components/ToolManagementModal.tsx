import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ToolId, ToolConfig, getAllToolsMetadata, DEFAULT_TOOL_ORDER, getValidToolOrder } from '../types/tools';
import { Modal } from './Modal';
import { ToolOrderConfig } from './ToolOrderConfig';

interface ToolManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  toolConfig: ToolConfig;
  toolOrder: ToolId[];
  onSave: (config: ToolConfig, order: ToolId[]) => void;
}

type TabType = 'enable' | 'order';

/**
 * 工具管理弹窗组件
 * 允许用户启用/禁用工具和调整工具顺序
 */
export const ToolManagementModal: React.FC<ToolManagementModalProps> = ({
  isOpen,
  onClose,
  toolConfig,
  toolOrder,
  onSave,
}) => {
  const { t } = useTranslation();
  const [localConfig, setLocalConfig] = useState<ToolConfig>(toolConfig);
  const [localOrder, setLocalOrder] = useState<ToolId[]>(toolOrder);
  const [activeTab, setActiveTab] = useState<TabType>('enable');
  const allTools = getAllToolsMetadata();

  // 同步外部配置变化
  useEffect(() => {
    setLocalConfig(toolConfig);
    setLocalOrder(toolOrder);
  }, [toolConfig, toolOrder]);

  // 切换单个工具的启用状态
  const toggleTool = (toolId: ToolId) => {
    setLocalConfig(prev => {
      const isEnabled = prev.enabledTools.includes(toolId);
      return {
        ...prev,
        enabledTools: isEnabled
          ? prev.enabledTools.filter(id => id !== toolId)
          : [...prev.enabledTools, toolId],
      };
    });
  };

  // 全部启用
  const enableAll = () => {
    setLocalConfig(prev => ({
      ...prev,
      enabledTools: Object.values(ToolId),
    }));
  };

  // 全部禁用
  const disableAll = () => {
    setLocalConfig(prev => ({
      ...prev,
      enabledTools: [],
    }));
  };

  // 处理顺序变化
  const handleOrderChange = (newOrder: ToolId[]) => {
    setLocalOrder(getValidToolOrder(newOrder));
  };

  // 重置顺序
  const handleResetOrder = () => {
    setLocalOrder([...DEFAULT_TOOL_ORDER]);
  };

  // 保存配置
  const handleSave = () => {
    onSave(localConfig, localOrder);
    onClose();
  };

  // 取消并恢复原配置
  const handleCancel = () => {
    setLocalConfig(toolConfig);
    setLocalOrder(toolOrder);
    onClose();
  };

  // 按顺序排列工具列表
  const orderedTools = localOrder
    .map(id => allTools.find(t => t.id === id))
    .filter((t): t is NonNullable<typeof t> => t !== undefined);

  return (
    <Modal isOpen={isOpen} onClose={handleCancel} title={t('tools.management.title')}>
      <div className="space-y-4 nb-text">
        {/* 标签页切换 */}
        <div className="flex gap-2 border-b-[length:var(--nb-border-width)] border-[color:var(--nb-border)] pb-2">
          <button
            onClick={() => setActiveTab('enable')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'enable'
                ? 'bg-[color:var(--nb-accent-yellow)] nb-text nb-border nb-shadow'
                : 'nb-text-secondary hover:nb-bg-card'
            }`}
          >
            {t('tools.management.tabEnable')}
          </button>
          <button
            onClick={() => setActiveTab('order')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'order'
                ? 'bg-[color:var(--nb-accent-yellow)] nb-text nb-border nb-shadow'
                : 'nb-text-secondary hover:nb-bg-card'
            }`}
          >
            {t('tools.management.tabOrder')}
          </button>
        </div>

        {activeTab === 'enable' ? (
          <>
            <p className="nb-text-secondary">{t('tools.management.description')}</p>

            {/* 快捷操作按钮 */}
            <div className="flex gap-2">
              <button
                onClick={enableAll}
                className="nb-btn nb-btn-secondary text-sm px-4 py-2"
              >
                {t('tools.management.enableAll')}
              </button>
              <button
                onClick={disableAll}
                className="nb-btn nb-btn-secondary text-sm px-4 py-2"
              >
                {t('tools.management.disableAll')}
              </button>
            </div>

            {/* 工具列表 */}
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {orderedTools.map(tool => {
                const isEnabled = localConfig.enabledTools.includes(tool.id);
                return (
                  <div
                    key={tool.id}
                    className="nb-bg-card nb-border nb-shadow rounded-lg flex items-center justify-between p-3"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <span className="material-symbols-outlined text-[color:var(--nb-accent-blue)]">{tool.icon}</span>
                      <div>
                        <h4 className="font-semibold nb-text">{t(tool.nameKey)}</h4>
                        <p className="text-sm nb-text-secondary">{t(tool.descriptionKey)}</p>
                      </div>
                    </div>
                    <label className="nb-toggle">
                      <input
                        type="checkbox"
                        checked={isEnabled}
                        onChange={() => toggleTool(tool.id)}
                        className="sr-only"
                      />
                      <div className={`nb-toggle-track ${isEnabled ? 'active' : ''}`}>
                        <div className="nb-toggle-thumb"></div>
                      </div>
                    </label>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <ToolOrderConfig
            toolOrder={localOrder}
            enabledTools={localConfig.enabledTools}
            onOrderChange={handleOrderChange}
            onReset={handleResetOrder}
          />
        )}

        {/* 操作按钮 */}
        <div className="flex justify-end gap-3 pt-4 border-t-[length:var(--nb-border-width)] border-[color:var(--nb-border)]">
          <button
            onClick={handleCancel}
            className="nb-btn nb-btn-secondary px-6 py-2"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={handleSave}
            className="nb-btn nb-btn-primary px-6 py-2"
          >
            {t('tools.management.save')}
          </button>
        </div>
      </div>
    </Modal>
  );
};
