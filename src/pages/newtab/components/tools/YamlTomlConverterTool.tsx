import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ToolCard } from '../../../../components/ToolCard';
import { TOOL_METADATA, ToolId, ToolComponentProps } from '../../../../types/tools';
import { useCopyToClipboard } from '../../../../hooks/useCopyToClipboard';
import {
  convert,
  detectFormat,
  DataFormat,
  ConversionResult,
} from '../../../../utils/formatConverter';

/**
 * YAML/TOML 转换器工具组件
 */
export const YamlTomlConverterTool: React.FC<ToolComponentProps> = ({
  isExpanded,
  onToggleExpand,
}) => {
  const { t } = useTranslation();
  const { copy } = useCopyToClipboard();
  
  // 状态
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [error, setError] = useState<{ message: string; line?: number } | null>(null);
  const [sourceFormat, setSourceFormat] = useState<DataFormat>('json');
  const [targetFormat, setTargetFormat] = useState<DataFormat>('yaml');
  const [indentSize, setIndentSize] = useState<2 | 4>(2);
  const [autoDetect, setAutoDetect] = useState(true);

  // 格式选项
  const formatOptions: { value: DataFormat; label: string }[] = useMemo(() => [
    { value: 'json', label: 'JSON' },
    { value: 'yaml', label: 'YAML' },
    { value: 'toml', label: 'TOML' },
  ], []);

  // 防抖转换
  useEffect(() => {
    if (!input.trim()) {
      setOutput('');
      setError(null);
      return;
    }

    const timer = setTimeout(() => {
      const result = convert(input, sourceFormat, targetFormat, { indentSize });
      if (result.success) {
        setOutput(result.output);
        setError(null);
      } else {
        setOutput('');
        // 自动转换时静默错误
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [input, sourceFormat, targetFormat, indentSize]);

  // 自动检测格式
  useEffect(() => {
    if (!autoDetect || !input.trim()) return;
    
    const detected = detectFormat(input);
    if (detected.format && detected.confidence !== 'low') {
      setSourceFormat(detected.format);
      // 自动设置目标格式为不同的格式
      if (detected.format === targetFormat) {
        const otherFormats = formatOptions
          .map(o => o.value)
          .filter(f => f !== detected.format);
        setTargetFormat(otherFormats[0]);
      }
    }
  }, [input, autoDetect, targetFormat, formatOptions]);


  // 手动转换
  const handleConvert = useCallback(() => {
    if (!input.trim()) {
      setError({ message: t('tools.yamlTomlConverter.emptyInput') });
      setOutput('');
      return;
    }

    const result = convert(input, sourceFormat, targetFormat, { indentSize });
    if (result.success) {
      setOutput(result.output);
      setError(null);
    } else {
      setOutput('');
      setError(result.error || { message: t('tools.yamlTomlConverter.unknownError') });
    }
  }, [input, sourceFormat, targetFormat, indentSize, t]);

  // 复制输出
  const handleCopy = useCallback(() => {
    copy(output);
  }, [output, copy]);

  // 交换输入输出
  const handleSwap = useCallback(() => {
    if (!output) return;
    
    setInput(output);
    setOutput('');
    setError(null);
    
    // 交换格式
    const tempFormat = sourceFormat;
    setSourceFormat(targetFormat);
    setTargetFormat(tempFormat);
  }, [output, sourceFormat, targetFormat]);

  // 清空
  const handleClear = useCallback(() => {
    setInput('');
    setOutput('');
    setError(null);
  }, []);

  // 切换源格式
  const handleSourceFormatChange = useCallback((format: DataFormat) => {
    setSourceFormat(format);
    if (format === targetFormat) {
      // 自动切换目标格式
      const otherFormats = formatOptions
        .map(o => o.value)
        .filter(f => f !== format);
      setTargetFormat(otherFormats[0]);
    }
  }, [targetFormat, formatOptions]);

  // 切换目标格式
  const handleTargetFormatChange = useCallback((format: DataFormat) => {
    setTargetFormat(format);
    if (format === sourceFormat) {
      // 自动切换源格式
      const otherFormats = formatOptions
        .map(o => o.value)
        .filter(f => f !== format);
      setSourceFormat(otherFormats[0]);
    }
  }, [sourceFormat, formatOptions]);

  return (
    <ToolCard
      tool={TOOL_METADATA[ToolId.YAML_TOML_CONVERTER]}
      isExpanded={isExpanded}
      onToggleExpand={onToggleExpand}
    >
      <div className="h-full flex flex-col gap-4">
        {/* 控制栏 */}
        <div className="flex items-center gap-4 flex-wrap flex-shrink-0">
          {/* 源格式选择 */}
          <div className="flex items-center gap-2">
            <label className="text-sm nb-text-secondary">
              {t('tools.yamlTomlConverter.sourceFormat')}:
            </label>
            <select
              value={sourceFormat}
              onChange={e => handleSourceFormatChange(e.target.value as DataFormat)}
              className="nb-input text-sm"
            >
              {formatOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* 箭头 */}
          <span className="material-symbols-outlined text-xl nb-text-secondary">
            arrow_forward
          </span>

          {/* 目标格式选择 */}
          <div className="flex items-center gap-2">
            <label className="text-sm nb-text-secondary">
              {t('tools.yamlTomlConverter.targetFormat')}:
            </label>
            <select
              value={targetFormat}
              onChange={e => handleTargetFormatChange(e.target.value as DataFormat)}
              className="nb-input text-sm"
            >
              {formatOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div className="w-px h-6 nb-border-r mx-1"></div>

          {/* 缩进选项 */}
          <div className="flex items-center gap-2">
            <label className="text-sm nb-text-secondary">
              {t('tools.yamlTomlConverter.indent')}:
            </label>
            <select
              value={indentSize}
              onChange={e => setIndentSize(parseInt(e.target.value) as 2 | 4)}
              className="nb-input text-sm"
            >
              <option value={2}>2 {t('tools.yamlTomlConverter.spaces')}</option>
              <option value={4}>4 {t('tools.yamlTomlConverter.spaces')}</option>
            </select>
          </div>

          {/* 自动检测开关 */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={autoDetect}
              onChange={e => setAutoDetect(e.target.checked)}
              className="w-4 h-4 rounded nb-border accent-[var(--nb-accent-yellow)]"
            />
            <span className="text-sm nb-text-secondary">
              {t('tools.yamlTomlConverter.autoDetect')}
            </span>
          </label>

          <div className="flex-1"></div>

          {/* 操作按钮 */}
          <button
            onClick={handleSwap}
            disabled={!output}
            className="nb-btn nb-btn-secondary p-2"
            title={t('tools.yamlTomlConverter.swap')}
          >
            <span className="material-symbols-outlined text-lg">swap_horiz</span>
          </button>
          <button
            onClick={handleConvert}
            className="nb-btn nb-btn-primary text-sm"
          >
            {t('tools.yamlTomlConverter.convert')}
          </button>
          <button
            onClick={handleCopy}
            disabled={!output}
            className="nb-btn nb-btn-secondary text-sm"
          >
            {t('tools.yamlTomlConverter.copy')}
          </button>
          <button
            onClick={handleClear}
            className="nb-btn nb-btn-ghost text-sm"
          >
            {t('tools.yamlTomlConverter.clear')}
          </button>
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="p-3 nb-bg-card nb-border rounded-lg flex-shrink-0" style={{ borderColor: 'var(--nb-accent-pink)' }}>
            <p className="text-sm" style={{ color: 'var(--nb-accent-pink)' }}>
              {error.line && (
                <span className="font-medium">{t('tools.yamlTomlConverter.line')} {error.line}: </span>
              )}
              {error.message}
            </p>
          </div>
        )}

        {/* 输入输出区域 */}
        <div className="flex-1 grid grid-cols-2 gap-4 min-h-0">
          {/* 输入区 */}
          <div className="flex flex-col min-h-0">
            <label className="block text-sm font-medium nb-text mb-2 flex-shrink-0">
              {t('tools.yamlTomlConverter.input')} ({sourceFormat.toUpperCase()})
            </label>
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder={t('tools.yamlTomlConverter.inputPlaceholder')}
              className="nb-input flex-1 font-mono text-sm resize-none"
            />
          </div>

          {/* 输出区 */}
          <div className="flex flex-col min-h-0">
            <label className="block text-sm font-medium nb-text mb-2 flex-shrink-0">
              {t('tools.yamlTomlConverter.output')} ({targetFormat.toUpperCase()})
            </label>
            <textarea
              value={output}
              readOnly
              placeholder={t('tools.yamlTomlConverter.outputPlaceholder')}
              className="nb-input flex-1 font-mono text-sm resize-none nb-bg"
            />
          </div>
        </div>
      </div>
    </ToolCard>
  );
};
