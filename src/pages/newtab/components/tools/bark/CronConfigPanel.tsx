/**
 * Cron 配置面板组件
 * 用于定时任务的周期性时间配置
 */

import React, { useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CronField,
  FieldConfig,
  FIELD_METADATA,
  CRON_TEMPLATES,
  createDefaultFieldConfigs,
  getFieldMetadata,
} from '../../../../../types/cron';
import {
  generateCronExpression,
  parseExpressionToConfig,
  validateCronExpression,
  getNextExecutions,
  formatDateTime,
} from '../../../../../utils/cronUtils';

interface CronConfigPanelProps {
  value: string;
  onChange: (expression: string) => void;
  previewCount?: number;
}

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
    <div className="space-y-3">
      {/* 模式选择 */}
      <div className="space-y-2">
        {/* 每X模式 */}
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name={`mode-${field}`}
            checked={config.mode === 'every'}
            onChange={() => setMode('every')}
            className="w-4 h-4 accent-[var(--nb-accent-yellow)]"
          />
          <span className="text-sm nb-text">
            {t('tools.cronBuilder.modes.every', { unit: unitName })}
          </span>
        </label>

        {/* 周期模式 */}
        <label className="flex items-center gap-2 cursor-pointer flex-wrap">
          <input
            type="radio"
            name={`mode-${field}`}
            checked={config.mode === 'range'}
            onChange={() => setMode('range')}
            className="w-4 h-4 accent-[var(--nb-accent-yellow)]"
          />
          <span className="text-sm nb-text">{t('tools.cronBuilder.modes.range')}</span>
          {config.mode === 'range' && (
            <div className="flex items-center gap-1 ml-2">
              <input
                type="number"
                min={min}
                max={max}
                value={config.rangeStart ?? min}
                onChange={e => updateRange(parseInt(e.target.value) || min)}
                className="w-14 px-2 py-1 text-xs nb-input"
              />
              <span className="nb-text">-</span>
              <input
                type="number"
                min={min}
                max={max}
                value={config.rangeEnd ?? max}
                onChange={e => updateRange(undefined, parseInt(e.target.value) || max)}
                className="w-14 px-2 py-1 text-xs nb-input"
              />
            </div>
          )}
        </label>

        {/* 步进模式 */}
        <label className="flex items-center gap-2 cursor-pointer flex-wrap">
          <input
            type="radio"
            name={`mode-${field}`}
            checked={config.mode === 'step'}
            onChange={() => setMode('step')}
            className="w-4 h-4 accent-[var(--nb-accent-yellow)]"
          />
          <span className="text-sm nb-text">{t('tools.cronBuilder.modes.step')}</span>
          {config.mode === 'step' && (
            <div className="flex items-center gap-1 ml-2">
              <span className="text-xs nb-text-secondary">{t('tools.cronBuilder.stepStart')}:</span>
              <input
                type="number"
                min={min}
                max={max}
                value={config.stepStart ?? min}
                onChange={e => updateStep(parseInt(e.target.value) || min)}
                className="w-14 px-2 py-1 text-xs nb-input"
              />
              <span className="text-xs nb-text-secondary">/{t('tools.cronBuilder.stepInterval')}:</span>
              <input
                type="number"
                min={1}
                max={max - min + 1}
                value={config.stepInterval ?? 1}
                onChange={e => updateStep(undefined, parseInt(e.target.value) || 1)}
                className="w-14 px-2 py-1 text-xs nb-input"
              />
            </div>
          )}
        </label>

        {/* 指定模式 */}
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name={`mode-${field}`}
            checked={config.mode === 'specific'}
            onChange={() => setMode('specific')}
            className="w-4 h-4 accent-[var(--nb-accent-yellow)]"
          />
          <span className="text-sm nb-text">{t('tools.cronBuilder.modes.specific')}</span>
        </label>
      </div>

      {/* 指定值复选框网格 */}
      {config.mode === 'specific' && (
        <div
          className="p-2 rounded-lg border-2 border-[var(--nb-border)]"
          style={{ backgroundColor: 'var(--nb-bg-base)' }}
        >
          <div
            className="grid gap-1"
            style={{ gridTemplateColumns: `repeat(${field === 'month' ? 6 : 10}, minmax(0, 1fr))` }}
          >
            {values.map(value => {
              const isSelected = config.specificValues?.includes(value);
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => toggleSpecificValue(value)}
                  className={`px-1 py-1 text-xs font-medium rounded border-2 transition-all ${
                    isSelected
                      ? 'border-[var(--nb-border)] shadow-[1px_1px_0px_0px_var(--nb-border)]'
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

/**
 * Cron 配置面板主组件
 */
export const CronConfigPanel: React.FC<CronConfigPanelProps> = ({
  value,
  onChange,
  previewCount = 5,
}) => {
  const { t } = useTranslation();

  // 状态
  const [activeTab, setActiveTab] = useState<CronField>('minute');
  const [fieldConfigs, setFieldConfigs] = useState<Record<CronField, FieldConfig>>(() => {
    if (value && validateCronExpression(value).isValid) {
      return parseExpressionToConfig(value);
    }
    return createDefaultFieldConfigs();
  });

  // 计算生成的表达式
  const generatedExpression = useMemo(
    () => generateCronExpression(fieldConfigs),
    [fieldConfigs]
  );

  // 验证结果
  const validation = useMemo(
    () => validateCronExpression(generatedExpression),
    [generatedExpression]
  );

  // 未来执行时间
  const nextExecutions = useMemo(() => {
    if (validation.isValid) {
      return getNextExecutions(generatedExpression, previewCount);
    }
    return [];
  }, [generatedExpression, validation.isValid, previewCount]);

  // 更新字段配置
  const updateFieldConfig = useCallback((field: CronField, config: FieldConfig) => {
    setFieldConfigs(prev => {
      const newConfigs = { ...prev, [field]: config };
      const newExpression = generateCronExpression(newConfigs);
      onChange(newExpression);
      return newConfigs;
    });
  }, [onChange]);

  // 应用模板
  const applyTemplate = useCallback((expression: string) => {
    const configs = parseExpressionToConfig(expression);
    setFieldConfigs(configs);
    onChange(expression);
  }, [onChange]);

  // 获取当前字段的元数据
  const currentFieldMeta = getFieldMetadata(activeTab);

  return (
    <div className="space-y-4">
      {/* 当前表达式显示 */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium nb-text">
          {t('tools.cronBuilder.expression')}:
        </span>
        <code
          className="flex-1 px-3 py-1.5 rounded-lg font-mono text-sm nb-border"
          style={{ backgroundColor: 'var(--nb-bg-base)' }}
        >
          {generatedExpression}
        </code>
        {validation.isValid ? (
          <span
            className="material-symbols-outlined text-lg"
            style={{ color: 'var(--nb-accent-green)' }}
          >
            check_circle
          </span>
        ) : (
          <span
            className="material-symbols-outlined text-lg"
            style={{ color: 'var(--nb-accent-pink)' }}
          >
            error
          </span>
        )}
      </div>

      {/* 快速模板 */}
      <div>
        <label className="block text-xs font-medium nb-text-secondary mb-2">
          {t('tools.cronBuilder.templates')}
        </label>
        <div className="flex flex-wrap gap-1">
          {CRON_TEMPLATES.slice(0, 6).map(template => (
            <button
              key={template.key}
              type="button"
              onClick={() => applyTemplate(template.expression)}
              className={`px-2 py-1 text-xs rounded-md nb-border transition-all hover:shadow-[2px_2px_0px_0px_var(--nb-border)] ${
                generatedExpression === template.expression
                  ? 'shadow-[2px_2px_0px_0px_var(--nb-border)]'
                  : ''
              }`}
              style={{
                backgroundColor: generatedExpression === template.expression
                  ? 'var(--nb-accent-yellow)'
                  : 'var(--nb-bg-card)',
              }}
            >
              {t(template.labelKey)}
            </button>
          ))}
        </div>
      </div>

      {/* Tab 导航 */}
      <div className="flex gap-1 p-1 rounded-lg nb-border" style={{ backgroundColor: 'var(--nb-bg-base)' }}>
        {FIELD_METADATA.map(meta => (
          <button
            key={meta.key}
            type="button"
            onClick={() => setActiveTab(meta.key)}
            className={`flex-1 px-2 py-1.5 text-xs font-bold rounded-md transition-all border-2 ${
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

      {/* 配置面板 */}
      <div
        className="p-3 rounded-lg nb-border"
        style={{ backgroundColor: 'var(--nb-bg-card)' }}
      >
        <FieldConfigPanel
          field={activeTab}
          config={fieldConfigs[activeTab]}
          metadata={currentFieldMeta}
          onChange={config => updateFieldConfig(activeTab, config)}
        />
      </div>

      {/* 未来执行时间预览 */}
      {nextExecutions.length > 0 && (
        <div>
          <label className="block text-xs font-medium nb-text-secondary mb-2">
            {t('tools.cronBuilder.nextExecutions')} ({previewCount})
          </label>
          <div className="space-y-1">
            {nextExecutions.map((time, index) => (
              <div
                key={index}
                className="flex items-center gap-2 px-2 py-1 rounded-md nb-border text-xs"
                style={{ backgroundColor: 'var(--nb-bg-card)' }}
              >
                <span
                  className="font-bold px-1.5 py-0.5 rounded"
                  style={{ backgroundColor: 'var(--nb-accent-blue)' }}
                >
                  #{index + 1}
                </span>
                <span className="font-mono nb-text">{formatDateTime(time)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Chrome 扩展最小间隔警告 */}
      <div
        className="flex items-start gap-2 p-3 rounded-lg nb-border text-xs"
        style={{ backgroundColor: 'var(--nb-accent-yellow)', opacity: 0.9 }}
      >
        <span className="material-symbols-outlined text-base flex-shrink-0">info</span>
        <span className="nb-text">
          {t('tools.barkNotifier.scheduled.minIntervalWarning')}
        </span>
      </div>
    </div>
  );
};
