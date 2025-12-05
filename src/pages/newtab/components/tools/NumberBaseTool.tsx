import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ToolCard } from '../../../../components/ToolCard';
import { TOOL_METADATA, ToolId, ToolComponentProps } from '../../../../types/tools';
import { useCopyToClipboard } from '../../../../hooks/useCopyToClipboard';

export type BaseType = 'bin' | 'oct' | 'dec' | 'hex';

export interface ConversionResult {
  binary: string;
  octal: string;
  decimal: string;
  hexadecimal: string;
  error: string | null;
}

/**
 * 验证进制输入
 */
export const validateBaseInput = (value: string, base: BaseType): boolean => {
  if (!value) return true;
  const patterns: Record<BaseType, RegExp> = {
    bin: /^[01]+$/,
    oct: /^[0-7]+$/,
    dec: /^[0-9]+$/,
    hex: /^[0-9a-fA-F]+$/,
  };
  return patterns[base].test(value);
};

/**
 * 转换进制
 */
export const convertBase = (value: string, fromBase: BaseType): ConversionResult => {
  if (!value) {
    return { binary: '', octal: '', decimal: '', hexadecimal: '', error: null };
  }

  if (!validateBaseInput(value, fromBase)) {
    return { binary: '', octal: '', decimal: '', hexadecimal: '', error: 'invalid' };
  }

  const radix: Record<BaseType, number> = { bin: 2, oct: 8, dec: 10, hex: 16 };
  const num = parseInt(value, radix[fromBase]);

  if (isNaN(num)) {
    return { binary: '', octal: '', decimal: '', hexadecimal: '', error: 'invalid' };
  }

  return {
    binary: num.toString(2),
    octal: num.toString(8),
    decimal: num.toString(10),
    hexadecimal: num.toString(16).toUpperCase(),
    error: null,
  };
};

export const NumberBaseTool: React.FC<ToolComponentProps> = ({ isExpanded, onToggleExpand }) => {
  const { t } = useTranslation();
  const { copy } = useCopyToClipboard();
  const [values, setValues] = useState<ConversionResult>({
    binary: '', octal: '', decimal: '', hexadecimal: '', error: null,
  });

  const handleChange = useCallback((value: string, base: BaseType) => {
    const result = convertBase(value, base);
    setValues(result);
  }, []);

  const handleClear = () => {
    setValues({ binary: '', octal: '', decimal: '', hexadecimal: '', error: null });
  };

  const bases: { key: BaseType; label: string; field: keyof ConversionResult }[] = [
    { key: 'bin', label: t('tools.numberBase.binary'), field: 'binary' },
    { key: 'oct', label: t('tools.numberBase.octal'), field: 'octal' },
    { key: 'dec', label: t('tools.numberBase.decimal'), field: 'decimal' },
    { key: 'hex', label: t('tools.numberBase.hexadecimal'), field: 'hexadecimal' },
  ];

  return (
    <ToolCard tool={TOOL_METADATA[ToolId.NUMBER_BASE]} isExpanded={isExpanded} onToggleExpand={onToggleExpand}>
      <div className="h-full flex flex-col gap-4">
        <div className="flex justify-end flex-shrink-0">
          <button onClick={handleClear} className="nb-btn nb-btn-ghost text-sm">
            {t('tools.numberBase.clear')}
          </button>
        </div>

        {values.error && (
          <div className="p-3 nb-bg-card nb-border rounded-lg flex-shrink-0" style={{ borderColor: 'var(--nb-accent-pink)' }}>
            <p className="text-sm" style={{ color: 'var(--nb-accent-pink)' }}>{t('tools.numberBase.invalidInput')}</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          {bases.map(({ key, label, field }) => (
            <div key={key}>
              <label className="block text-sm font-medium nb-text mb-2">{label}</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={values[field] as string}
                  onChange={e => handleChange(e.target.value, key)}
                  placeholder={t('tools.numberBase.inputPlaceholder')}
                  className="nb-input flex-1 font-mono text-sm"
                />
                <button
                  onClick={() => copy(values[field] as string)}
                  disabled={!values[field]}
                  className="nb-btn nb-btn-ghost text-sm"
                >
                  {t('tools.numberBase.copy')}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </ToolCard>
  );
};
