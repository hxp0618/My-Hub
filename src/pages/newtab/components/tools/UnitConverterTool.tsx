import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ToolCard } from '../../../../components/ToolCard';
import { TOOL_METADATA, ToolId, ToolComponentProps } from '../../../../types/tools';
import { useCopyToClipboard } from '../../../../hooks/useCopyToClipboard';
import {
  UnitCategory,
  Unit,
  ConversionResult,
  CATEGORY_CONFIGS,
  validateInput,
  convertUnits,
  saveCategoryPreference,
  loadCategoryPreference,
  getCategoryConfig,
  formatTimeReadable,
  TimeUnit,
} from '../../../../utils/unitConverter';

/**
 * 单位转换工具组件
 * 支持时间、长度、数据存储、重量单位的相互转换
 */
export const UnitConverterTool: React.FC<ToolComponentProps> = ({
  isExpanded,
  onToggleExpand,
}) => {
  const { t } = useTranslation();
  const { copy } = useCopyToClipboard();

  // 从 localStorage 恢复类别
  const getInitialCategory = (): UnitCategory => {
    return loadCategoryPreference() || 'time';
  };

  const [category, setCategory] = useState<UnitCategory>(getInitialCategory);
  const [inputValue, setInputValue] = useState('');
  const [sourceUnit, setSourceUnit] = useState<Unit>(() => {
    const config = getCategoryConfig(getInitialCategory());
    return config.units[0].key;
  });
  const [results, setResults] = useState<ConversionResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  // 获取当前类别配置
  const currentCategoryConfig = useMemo(() => getCategoryConfig(category), [category]);

  // 切换类别时重置状态
  const handleCategoryChange = useCallback((newCategory: UnitCategory) => {
    setCategory(newCategory);
    setInputValue('');
    setResults([]);
    setError(null);
    // 设置默认源单位为该类别的第一个单位
    const config = getCategoryConfig(newCategory);
    setSourceUnit(config.units[0].key);
    // 保存到 localStorage
    saveCategoryPreference(newCategory);
  }, []);

  // 执行转换
  const performConversion = useCallback((value: string, unit: Unit, catConfig: typeof currentCategoryConfig) => {
    if (!value || value.trim() === '') {
      setResults([]);
      setError(null);
      return;
    }

    if (!validateInput(value)) {
      setError(t('tools.unitConverter.invalidInput'));
      return;
    }

    setError(null);
    const numValue = parseFloat(value);
    const newResults = convertUnits(numValue, unit, catConfig.key);
    setResults(newResults);
  }, [t]);

  // 处理输入变化
  const handleInputChange = useCallback((value: string) => {
    setInputValue(value);
    performConversion(value, sourceUnit, currentCategoryConfig);
  }, [sourceUnit, currentCategoryConfig, performConversion]);

  // 处理源单位变化
  const handleSourceUnitChange = useCallback((unit: Unit) => {
    setSourceUnit(unit);
    performConversion(inputValue, unit, currentCategoryConfig);
  }, [inputValue, currentCategoryConfig, performConversion]);

  // 清空
  const handleClear = useCallback(() => {
    setInputValue('');
    setResults([]);
    setError(null);
  }, []);

  // 复制结果
  const handleCopyResult = useCallback((value: string) => {
    copy(value);
  }, [copy]);

  // 键盘事件处理 - Enter 键聚焦输入框
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 如果已经在输入框中，不处理
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') {
        return;
      }
      
      if (e.key === 'Enter') {
        const input = document.getElementById('unit-converter-input');
        if (input) {
          input.focus();
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <ToolCard
      tool={TOOL_METADATA[ToolId.UNIT_CONVERTER]}
      isExpanded={isExpanded}
      onToggleExpand={onToggleExpand}
    >
      <div className="h-full flex flex-col gap-4">
        {/* 类别选择器 */}
        <div className="flex gap-2 flex-wrap flex-shrink-0">
          {CATEGORY_CONFIGS.map(config => (
            <button
              key={config.key}
              onClick={() => handleCategoryChange(config.key)}
              className={`nb-btn text-sm ${
                category === config.key ? 'nb-btn-primary' : 'nb-btn-secondary'
              }`}
            >
              {t(config.labelKey)}
            </button>
          ))}
          <div className="flex-1"></div>
          <button onClick={handleClear} className="nb-btn nb-btn-ghost text-sm">
            {t('tools.unitConverter.clear')}
          </button>
        </div>

        {/* 输入区域 */}
        <div className="flex gap-4 flex-shrink-0">
          <div className="flex-1">
            <label className="block text-sm font-medium nb-text mb-2">
              {t('tools.unitConverter.inputValue')}
            </label>
            <input
              id="unit-converter-input"
              type="text"
              value={inputValue}
              onChange={e => handleInputChange(e.target.value)}
              placeholder={t('tools.unitConverter.inputPlaceholder')}
              className="nb-input w-full font-mono text-sm"
            />
          </div>
          <div className="w-40">
            <label className="block text-sm font-medium nb-text mb-2">
              {t('tools.unitConverter.sourceUnit')}
            </label>
            <select
              value={sourceUnit}
              onChange={e => handleSourceUnitChange(e.target.value as Unit)}
              className="nb-input w-full text-sm"
            >
              {currentCategoryConfig.units.map(unit => (
                <option key={unit.key} value={unit.key}>
                  {t(unit.labelKey)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 错误提示 */}
        {error && (
          <div
            className="p-3 nb-bg-card nb-border rounded-lg flex-shrink-0"
            style={{ borderColor: 'var(--nb-accent-pink)' }}
          >
            <p className="text-sm" style={{ color: 'var(--nb-accent-pink)' }}>
              {error}
            </p>
          </div>
        )}

        {/* 结果网格 */}
        <div className="flex-1 overflow-y-auto">
          <label className="block text-sm font-medium nb-text mb-2">
            {t('tools.unitConverter.results')}
          </label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {currentCategoryConfig.units.map(unit => {
              const result = results.find(r => r.unit === unit.key);
              const displayValue = result?.value || '-';
              const isSource = unit.key === sourceUnit;
              const hasValue = result && result.value !== '-';

              // 计算易读格式（仅时间类别）
              const readableFormat =
                category === 'time' && result && !isSource
                  ? formatTimeReadable(result.rawValue, unit.key as TimeUnit)
                  : null;

              return (
                <div
                  key={unit.key}
                  onClick={() => hasValue && handleCopyResult(result.value)}
                  className={`p-3 nb-bg-card nb-border rounded-lg transition-all ${
                    hasValue ? 'cursor-pointer hover:translate-x-0.5 hover:translate-y-0.5' : ''
                  } ${isSource ? 'ring-2 ring-offset-1' : ''}`}
                  style={{
                    borderColor: isSource ? 'var(--nb-accent-yellow)' : undefined,
                    '--tw-ring-color': isSource ? 'var(--nb-accent-yellow)' : undefined,
                  } as React.CSSProperties}
                  title={hasValue ? t('tools.unitConverter.clickToCopy') : undefined}
                >
                  <div className="text-xs nb-text-secondary mb-1 flex items-center justify-between">
                    <span>{t(unit.labelKey)}</span>
                    {isSource && (
                      <span
                        className="text-xs px-1.5 py-0.5 rounded"
                        style={{
                          backgroundColor: 'var(--nb-accent-yellow)',
                          color: 'var(--nb-border)'
                        }}
                      >
                        {t('tools.unitConverter.source')}
                      </span>
                    )}
                  </div>
                  <div className="font-mono text-sm nb-text truncate" title={displayValue}>
                    {displayValue}
                  </div>
                  {readableFormat && (
                    <div className="text-xs nb-text-secondary mt-1 opacity-70">
                      ({readableFormat})
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* 提示信息 */}
        <div className="flex-shrink-0 text-xs nb-text-secondary">
          {t('tools.unitConverter.hint')}
        </div>
      </div>
    </ToolCard>
  );
};
