import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ToolCard } from '../../../../components/ToolCard';
import { TOOL_METADATA, ToolId, ToolComponentProps } from '../../../../types/tools';
import { useCopyToClipboard } from '../../../../hooks/useCopyToClipboard';

export interface PasswordOptions {
  length: number;
  uppercase: boolean;
  lowercase: boolean;
  numbers: boolean;
  symbols: boolean;
}

const CHAR_SETS = {
  uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  lowercase: 'abcdefghijklmnopqrstuvwxyz',
  numbers: '0123456789',
  symbols: '!@#$%^&*()_+-=[]{}|;:,.<>?',
};

/**
 * 生成密码
 */
export const generatePassword = (options: PasswordOptions): string => {
  let chars = '';
  if (options.uppercase) chars += CHAR_SETS.uppercase;
  if (options.lowercase) chars += CHAR_SETS.lowercase;
  if (options.numbers) chars += CHAR_SETS.numbers;
  if (options.symbols) chars += CHAR_SETS.symbols;

  if (!chars) return '';

  let password = '';
  const array = new Uint32Array(options.length);
  crypto.getRandomValues(array);
  for (let i = 0; i < options.length; i++) {
    password += chars[array[i] % chars.length];
  }
  return password;
};

/**
 * 计算密码强度
 */
export const calculateStrength = (password: string, options: PasswordOptions): number => {
  if (!password) return 0;
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (password.length >= 16) score++;
  if (options.uppercase && options.lowercase) score++;
  if (options.numbers) score++;
  if (options.symbols) score++;
  return Math.min(score, 4);
};

export const PasswordGeneratorTool: React.FC<ToolComponentProps> = ({ isExpanded, onToggleExpand }) => {
  const { t } = useTranslation();
  const { copy } = useCopyToClipboard();
  const [options, setOptions] = useState<PasswordOptions>({
    length: 16, uppercase: true, lowercase: true, numbers: true, symbols: false,
  });
  const [password, setPassword] = useState('');

  const canGenerate = options.uppercase || options.lowercase || options.numbers || options.symbols;
  const strength = calculateStrength(password, options);
  const strengthLabels = ['weak', 'weak', 'medium', 'strong', 'veryStrong'];
  const strengthColors = ['bg-red-500', 'bg-red-500', 'bg-yellow-500', 'bg-green-500', 'bg-green-600'];

  const handleGenerate = useCallback(() => {
    setPassword(generatePassword(options));
  }, [options]);

  const updateOption = <K extends keyof PasswordOptions>(key: K, value: PasswordOptions[K]) => {
    setOptions(prev => ({ ...prev, [key]: value }));
  };

  return (
    <ToolCard tool={TOOL_METADATA[ToolId.PASSWORD_GENERATOR]} isExpanded={isExpanded} onToggleExpand={onToggleExpand}>
      <div className="h-full flex flex-col gap-4">
        <div className="flex-shrink-0 space-y-4">
          {/* 长度滑块 */}
          <div>
            <label className="block text-sm font-medium nb-text mb-2">
              {t('tools.passwordGenerator.length')}: {options.length}
            </label>
            <input
              type="range" min={8} max={128} value={options.length}
              onChange={e => updateOption('length', parseInt(e.target.value))}
              className="w-full accent-[var(--nb-accent-yellow)]"
            />
          </div>

          {/* 字符选项 */}
          <div>
            <label className="block text-sm font-medium nb-text mb-2">{t('tools.passwordGenerator.options')}</label>
            <div className="grid grid-cols-2 gap-2">
              {(['uppercase', 'lowercase', 'numbers', 'symbols'] as const).map(key => (
                <label key={key} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox" checked={options[key]}
                    onChange={e => updateOption(key, e.target.checked)}
                    className="w-4 h-4 rounded nb-border accent-[var(--nb-accent-yellow)]"
                  />
                  <span className="text-sm nb-text">{t(`tools.passwordGenerator.${key}`)}</span>
                </label>
              ))}
            </div>
          </div>

          {/* 生成按钮 */}
          <div className="flex gap-2">
            <button
              onClick={handleGenerate} disabled={!canGenerate}
              className="nb-btn nb-btn-primary text-sm"
            >
              {t('tools.passwordGenerator.generate')}
            </button>
            <button
              onClick={() => copy(password)} disabled={!password}
              className="nb-btn nb-btn-secondary text-sm"
            >
              {t('tools.passwordGenerator.copy')}
            </button>
          </div>

          {!canGenerate && (
            <p className="text-sm" style={{ color: 'var(--nb-accent-pink)' }}>{t('tools.passwordGenerator.noOptionsSelected')}</p>
          )}
        </div>

        {/* 结果 */}
        <div className="flex-1 flex flex-col min-h-0">
          <label className="block text-sm font-medium nb-text mb-2 flex-shrink-0">{t('tools.passwordGenerator.result')}</label>
          <div className="flex-1 p-4 nb-card-static flex items-center justify-center">
            {password ? (
              <div className="text-center w-full">
                <p className="font-mono text-lg break-all mb-4 nb-text">{password}</p>
                <div className="flex items-center justify-center gap-2">
                  <span className="text-sm nb-text-secondary">{t('tools.passwordGenerator.strength')}:</span>
                  <div className="flex gap-1">
                    {[0, 1, 2, 3].map(i => (
                      <div key={i} className={`w-6 h-2 rounded ${i < strength ? strengthColors[strength] : 'bg-gray-300'}`} />
                    ))}
                  </div>
                  <span className="text-sm nb-text">{t(`tools.passwordGenerator.${strengthLabels[strength]}`)}</span>
                </div>
              </div>
            ) : (
              <span className="nb-text-secondary">{t('tools.passwordGenerator.emptyResult')}</span>
            )}
          </div>
        </div>
      </div>
    </ToolCard>
  );
};
