import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ToolCard } from '../../../../components/ToolCard';
import { TOOL_METADATA } from '../../../../types/tools';
import { ToolId, ToolComponentProps } from '../../../../types/tools';
import { useCopyToClipboard } from '../../../../hooks/useCopyToClipboard';
import {
  CronField,
  FieldConfig,
  FIELD_METADATA,
  CRON_TEMPLATES,
  createDefaultFieldConfigs,
  getFieldMetadata,
} from '../../../../types/cron';
import {
  generateCronExpression,
  parseExpressionToConfig,
  validateCronExpression,
  getNextExecutions,
  formatDateTime,
} from '../../../../utils/cronUtils';

/**
 * Cron 表达式生成器工具组件
 */
export const CronBuilderTool: React.FC<ToolComponentProps> = ({
  isExpanded,
  onToggleExpand,
}) => {
  const { t } = useTranslation();
  const { copy } = useCopyToClipboard();

  // 状态
  const [activeTab, setActiveTab] = useState<CronField>('minute');
  const [fieldConfigs, setFieldConfigs] = useState<Record<CronField, FieldConfig>>(
    createDefaultFieldConfigs
  );
  const [manualExpression, setManualExpression] = useState('');
  const [isManualMode, setIsManualMode] = useState(false);

  // 计算生成的表达式
  const generatedExpression = useMemo(
    () => generateCronExpression(fieldConfigs),
    [fieldConfigs]
  );

  // 当前使用的表达式
  const currentExpression = isManualMode ? manualExpression : generatedExpression;

  // 验证结果
  const validation = useMemo(
    () => validateCronExpression(currentExpression),
    [currentExpression]
  );

  // 未来执行时间
  const nextExecutions = useMemo(() => {
    if (validation.isValid) {
      return getNextExecutions(currentExpression, 10);
    }
    return [];
  }, [currentExpression, validation.isValid]);

  // 同步手动输入到配置
  useEffect(() => {
    if (isManualMode && validation.isValid) {
      const configs = parseExpressionToConfig(manualExpression);
      setFieldConfigs(configs);
    }
  }, [manualExpression, isManualMode, validation.isValid]);

  // 更新字段配置
  const updateFieldConfig = useCallback((field: CronField, config: FieldConfig) => {
    setFieldConfigs(prev => ({ ...prev, [field]: config }));
    setIsManualMode(false);
  }, []);

  // 应用模板
  const applyTemplate = useCallback((expression: string) => {
    const configs = parseExpressionToConfig(expression);
    setFieldConfigs(configs);
    setManualExpression(expression);
    setIsManualMode(false);
  }, []);

  // 复制表达式
  const handleCopy = useCallback(() => {
    copy(currentExpression);
  }, [currentExpression, copy]);

  // 手动输入变化
  const handleManualInput = useCallback((value: string) => {
    setManualExpression(value);
    setIsManualMode(true);
  }, []);

  // 获取当前字段的元数据
  const currentFieldMeta = getFieldMetadata(activeTab);

  return (
    <ToolCard
      tool={TOOL_METADATA[ToolId.CRON_BUILDER]}
      isExpanded={isExpanded}
      onToggleExpand={onToggleExpand}
    >
      <div className="h-full flex flex-col gap-4">
        {/* Cron 表达式输入区 */}
        <div className="flex-shrink-0">
          <label className="block text-sm font-bold nb-text mb-2">
            {t('tools.cronBuilder.expression')}
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={currentExpression}
              onChange={e => handleManualInput(e.target.value)}
              placeholder="* * * * *"
              className="nb-input flex-1 font-mono text-lg"
            />
            <button
              onClick={handleCopy}
              className="nb-btn nb-btn-secondary px-3"
              title={t('tools.cronBuilder.copy')}
            >
              <span className="material-symbols-outlined text-xl">content_copy</span>
            </button>
          </div>
          <p className="text-xs nb-text-secondary mt-1">
            {t('tools.cronBuilder.format')}: {t('tools.cronBuilder.formatDesc')}
          </p>
        </div>

        {/* 验证状态 */}
        {validation.isValid ? (
          <div
            className="p-3 rounded-lg border-2 flex-shrink-0"
            style={{
              borderColor: 'var(--nb-accent-green)',
              backgroundColor: 'var(--nb-bg-card)',
            }}
          >
            <p className="text-sm font-medium" style={{ color: 'var(--nb-accent-green)' }}>
              {t(validation.description || 'tools.cronBuilder.validExpression')}
            </p>
          </div>
        ) : (
          <div
            className="p-3 rounded-lg border-2 flex-shrink-0"
            style={{
              borderColor: 'var(--nb-accent-pink)',
              backgroundColor: 'var(--nb-bg-card)',
            }}
          >
            <p className="text-sm font-medium" style={{ color: 'var(--nb-accent-pink)' }}>
              {t('tools.cronBuilder.invalidExpression')}
            </p>
          </div>
        )}

        {/* Tab 导航 */}
        <div className="flex-shrink-0">
          <div className="flex gap-1 p-1 rounded-lg border-2 border-[var(--nb-border)]" style={{ backgroundColor: 'var(--nb-bg-base)' }}>
            {FIELD_METADATA.map(meta => (
              <button
                key={meta.key}
                onClick={() => setActiveTab(meta.key)}
                className={`flex-1 px-3 py-2 text-sm font-bold rounded-md transition-all border-2 ${
                  activeTab === meta.key
                    ? 'border-[var(--nb-border)] shadow-[2px_2px_0px_0px_var(--nb-border)]'
                    : 'border-transparent hover:border-[var(--nb-border)]'
                }`}
                style={{
                  backgroundColor: activeTab === meta.key ? 'var(--nb-accent-yellow)' : 'transparent',
                  color: 'var(--nb-text)',
                }}
              >
                {t(meta.label)}
              </button>
            ))}
          </div>
        </div>

        {/* 配置面板 */}
        <div
          className="flex-shrink-0 p-4 rounded-xl border-2 border-[var(--nb-border)] shadow-[4px_4px_0px_0px_var(--nb-border)]"
          style={{ backgroundColor: 'var(--nb-bg-card)' }}
        >
          <FieldConfigPanel
            field={activeTab}
            config={fieldConfigs[activeTab]}
            metadata={currentFieldMeta}
            onChange={config => updateFieldConfig(activeTab, config)}
          />
        </div>

        {/* 底部区域：模板和执行时间 */}
        <div className="flex-1 grid grid-cols-2 gap-4 min-h-0">
          {/* 快速模板 */}
          <div className="flex flex-col min-h-0">
            <label className="block text-sm font-bold nb-text mb-2 flex-shrink-0">
              {t('tools.cronBuilder.templates')}
            </label>
            <div className="flex-1 overflow-auto space-y-2">
              {CRON_TEMPLATES.map(template => (
                <button
                  key={template.key}
                  onClick={() => applyTemplate(template.expression)}
                  className="w-full text-left px-3 py-2 rounded-lg border-2 border-[var(--nb-border)] shadow-[3px_3px_0px_0px_var(--nb-border)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_0px_var(--nb-border)] transition-all"
                  style={{ backgroundColor: 'var(--nb-bg-card)' }}
                >
                  <div className="font-medium nb-text text-sm">
                    {t(template.labelKey)}
                  </div>
                  <div className="text-xs nb-text-secondary font-mono mt-0.5">
                    {template.expression}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* 未来执行时间 */}
          <div className="flex flex-col min-h-0">
            <label className="block text-sm font-bold nb-text mb-2 flex-shrink-0">
              {t('tools.cronBuilder.nextExecutions')}
            </label>
            {nextExecutions.length > 0 ? (
              <div className="flex-1 overflow-auto space-y-1.5">
                {nextExecutions.map((time, index) => (
                  <div
                    key={index}
                    className="px-3 py-2 rounded-lg border-2 border-[var(--nb-border)]"
                    style={{ backgroundColor: 'var(--nb-bg-card)' }}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="text-xs font-bold px-1.5 py-0.5 rounded"
                        style={{ backgroundColor: 'var(--nb-accent-blue)', color: 'var(--nb-text)' }}
                      >
                        #{index + 1}
                      </span>
                      <span className="text-sm font-mono nb-text">{formatDateTime(time)}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div
                className="flex-1 flex items-center justify-center rounded-lg border-2 border-dashed border-[var(--nb-border)]"
                style={{ backgroundColor: 'var(--nb-bg-base)' }}
              >
                <p className="text-sm nb-text-secondary">
                  {t('tools.cronBuilder.selectTemplate')}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </ToolCard>
  );
};


/**
 * 字段配置面板组件
 */
interface FieldConfigPanelProps {
  field: CronField;
  config: FieldConfig;
  metadata: { min: number; max: number; label: string };
  onChange: (config: FieldConfig) => void;
}

const FieldConfigPanel: React.FC<FieldConfigPanelProps> = ({
  field,
  config,
  metadata,
  onChange,
}) => {
  const { t } = useTranslation();
  const { min, max } = metadata;

  // 生成值数组
  const values = useMemo(() => {
    const arr: number[] = [];
    for (let i = min; i <= max; i++) {
      arr.push(i);
    }
    return arr;
  }, [min, max]);

  // 获取单位名称
  const unitName = t(`tools.cronBuilder.fields.${field}`);

  // 切换模式
  const setMode = (mode: FieldConfig['mode']) => {
    const newConfig: FieldConfig = { mode };
    if (mode === 'range') {
      newConfig.rangeStart = min;
      newConfig.rangeEnd = max;
    } else if (mode === 'step') {
      newConfig.stepStart = min;
      newConfig.stepInterval = 1;
    } else if (mode === 'specific') {
      newConfig.specificValues = [];
    }
    onChange(newConfig);
  };

  // 更新范围值
  const updateRange = (start?: number, end?: number) => {
    onChange({
      ...config,
      rangeStart: start ?? config.rangeStart,
      rangeEnd: end ?? config.rangeEnd,
    });
  };

  // 更新步进值
  const updateStep = (start?: number, interval?: number) => {
    onChange({
      ...config,
      stepStart: start ?? config.stepStart,
      stepInterval: interval ?? config.stepInterval,
    });
  };

  // 切换指定值
  const toggleSpecificValue = (value: number) => {
    const current = config.specificValues || [];
    const newValues = current.includes(value)
      ? current.filter(v => v !== value)
      : [...current, value].sort((a, b) => a - b);
    onChange({ ...config, specificValues: newValues });
  };

  // 获取值的显示标签
  const getValueLabel = (value: number): string => {
    if (field === 'weekday') {
      return t(`tools.cronBuilder.weekdays.${value}`);
    }
    if (field === 'month') {
      return t(`tools.cronBuilder.months.${value}`);
    }
    return String(value);
  };

  return (
    <div className="space-y-4">
      {/* 模式选择 */}
      <div className="space-y-2">
        {/* 每X模式 */}
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="radio"
            name={`mode-${field}`}
            checked={config.mode === 'every'}
            onChange={() => setMode('every')}
            className="w-4 h-4 accent-[var(--nb-accent-yellow)]"
          />
          <span className="font-medium nb-text">
            {t('tools.cronBuilder.modes.every', { unit: unitName })}
          </span>
          <span className="text-xs nb-text-secondary">
            {t('tools.cronBuilder.modeDesc.every')}
          </span>
        </label>

        {/* 周期模式 */}
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="radio"
            name={`mode-${field}`}
            checked={config.mode === 'range'}
            onChange={() => setMode('range')}
            className="w-4 h-4 accent-[var(--nb-accent-yellow)]"
          />
          <span className="font-medium nb-text">{t('tools.cronBuilder.modes.range')}</span>
          {config.mode === 'range' && (
            <div className="flex items-center gap-2">
              <span className="text-sm nb-text-secondary">{t('tools.cronBuilder.rangeStart')}:</span>
              <input
                type="number"
                min={min}
                max={max}
                value={config.rangeStart ?? min}
                onChange={e => updateRange(parseInt(e.target.value) || min)}
                className="w-16 px-2 py-1 text-sm nb-input"
              />
              <span className="nb-text">-</span>
              <span className="text-sm nb-text-secondary">{t('tools.cronBuilder.rangeEnd')}:</span>
              <input
                type="number"
                min={min}
                max={max}
                value={config.rangeEnd ?? max}
                onChange={e => updateRange(undefined, parseInt(e.target.value) || max)}
                className="w-16 px-2 py-1 text-sm nb-input"
              />
            </div>
          )}
        </label>

        {/* 步进模式 */}
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="radio"
            name={`mode-${field}`}
            checked={config.mode === 'step'}
            onChange={() => setMode('step')}
            className="w-4 h-4 accent-[var(--nb-accent-yellow)]"
          />
          <span className="font-medium nb-text">{t('tools.cronBuilder.modes.step')}</span>
          {config.mode === 'step' && (
            <div className="flex items-center gap-2">
              <span className="text-sm nb-text-secondary">{t('tools.cronBuilder.stepStart')}:</span>
              <input
                type="number"
                min={min}
                max={max}
                value={config.stepStart ?? min}
                onChange={e => updateStep(parseInt(e.target.value) || min)}
                className="w-16 px-2 py-1 text-sm nb-input"
              />
              <span className="text-sm nb-text-secondary">{t('tools.cronBuilder.stepInterval')}:</span>
              <input
                type="number"
                min={1}
                max={max - min + 1}
                value={config.stepInterval ?? 1}
                onChange={e => updateStep(undefined, parseInt(e.target.value) || 1)}
                className="w-16 px-2 py-1 text-sm nb-input"
              />
            </div>
          )}
        </label>

        {/* 指定模式 */}
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="radio"
            name={`mode-${field}`}
            checked={config.mode === 'specific'}
            onChange={() => setMode('specific')}
            className="w-4 h-4 accent-[var(--nb-accent-yellow)]"
          />
          <span className="font-medium nb-text">{t('tools.cronBuilder.modes.specific')}</span>
        </label>
      </div>

      {/* 指定值复选框网格 */}
      {config.mode === 'specific' && (
        <div
          className="p-3 rounded-lg border-2 border-[var(--nb-border)]"
          style={{ backgroundColor: 'var(--nb-bg-base)' }}
        >
          <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${field === 'month' ? 6 : 10}, minmax(0, 1fr))` }}>
            {values.map(value => {
              const isSelected = config.specificValues?.includes(value);
              return (
                <button
                  key={value}
                  onClick={() => toggleSpecificValue(value)}
                  className={`px-1 py-1.5 text-xs font-medium rounded border-2 transition-all ${
                    isSelected
                      ? 'border-[var(--nb-border)] shadow-[2px_2px_0px_0px_var(--nb-border)]'
                      : 'border-[var(--nb-border)] opacity-60 hover:opacity-100'
                  }`}
                  style={{
                    backgroundColor: isSelected ? 'var(--nb-accent-yellow)' : 'var(--nb-bg-card)',
                    color: 'var(--nb-text)',
                  }}
                  title={getValueLabel(value)}
                >
                  {field === 'weekday' || field === 'month' ? getValueLabel(value).slice(0, 2) : value}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
