import React, { useState, useCallback, useEffect } from 'react';
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

interface HistoryItem {
  password: string;
  timestamp: number;
}

const CHAR_SETS = {
  uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  lowercase: 'abcdefghijklmnopqrstuvwxyz',
  numbers: '0123456789',
  symbols: '!@#$%^&*()_+-=[]{}|;:,.<>?',
};

const HISTORY_KEY = 'password-generator-history';
const MAX_HISTORY = 20;

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
  const [history, setHistory] = useState<HistoryItem[]>([]);

  // 加载历史记录
  useEffect(() => {
    try {
      const saved = localStorage.getItem(HISTORY_KEY);
      if (saved) {
        setHistory(JSON.parse(saved));
      }
    } catch {
      // ignore
    }
  }, []);

  // 保存历史记录
  const saveHistory = useCallback((newHistory: HistoryItem[]) => {
    setHistory(newHistory);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory));
  }, []);

  // 添加到历史记录
  const addToHistory = useCallback((pwd: string) => {
    const newItem: HistoryItem = {
      password: pwd,
      timestamp: Date.now(),
    };
    const newHistory = [newItem, ...history.filter(h => h.password !== pwd)].slice(0, MAX_HISTORY);
    saveHistory(newHistory);
  }, [history, saveHistory]);

  // 删除历史记录项
  const removeFromHistory = useCallback((timestamp: number) => {
    const newHistory = history.filter(h => h.timestamp !== timestamp);
    saveHistory(newHistory);
  }, [history, saveHistory]);

  // 清空历史记录
  const clearHistory = useCallback(() => {
    saveHistory([]);
  }, [saveHistory]);

  const canGenerate = options.uppercase || options.lowercase || options.numbers || options.symbols;
  const strength = calculateStrength(password, options);
  const strengthLabels = ['weak', 'weak', 'medium', 'strong', 'veryStrong'];
  const strengthColors = ['bg-red-500', 'bg-red-500', 'bg-yellow-500', 'bg-green-500', 'bg-green-600'];

  const handleGenerate = useCallback(() => {
    const newPassword = generatePassword(options);
    setPassword(newPassword);
    addToHistory(newPassword);
  }, [options, addToHistory]);

  const updateOption = <K extends keyof PasswordOptions>(key: K, value: PasswordOptions[K]) => {
    setOptions(prev => ({ ...prev, [key]: value }));
  };

  // 从历史记录中选择
  const selectFromHistory = useCallback((item: HistoryItem) => {
    setPassword(item.password);
  }, []);

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
        <div className="flex-1 flex flex-col min-h-0 gap-4">
          <div>
            <label className="block text-sm font-medium nb-text mb-2 flex-shrink-0">{t('tools.passwordGenerator.result')}</label>
            <div className="p-4 nb-card-static">
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
                <span className="nb-text-secondary block text-center">{t('tools.passwordGenerator.emptyResult')}</span>
              )}
            </div>
          </div>

          {/* 历史记录 */}
          <div className="flex-1 min-h-0 flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium nb-text">
                {t('tools.passwordGenerator.history')} ({history.length}/{MAX_HISTORY})
              </label>
              {history.length > 0 && (
                <button
                  onClick={clearHistory}
                  className="nb-btn nb-btn-ghost text-xs py-1 px-2"
                >
                  {t('tools.passwordGenerator.clearHistory')}
                </button>
              )}
            </div>
            <div className="flex-1 overflow-y-auto nb-card-subtle p-2 space-y-2">
              {history.length === 0 ? (
                <p className="text-sm nb-text-secondary text-center py-4">{t('tools.passwordGenerator.noHistory')}</p>
              ) : (
                history.map(item => (
                  <div
                    key={item.timestamp}
                    className="p-2 nb-bg rounded-lg nb-border cursor-pointer hover:opacity-80 transition-opacity group"
                    onClick={() => selectFromHistory(item)}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-mono text-sm truncate nb-text flex-1 min-w-0">{item.password}</p>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={(e) => { e.stopPropagation(); copy(item.password); }}
                          className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
                          title={t('tools.passwordGenerator.copy')}
                        >
                          <span className="material-symbols-outlined text-base nb-text-secondary">content_copy</span>
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); removeFromHistory(item.timestamp); }}
                          className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 opacity-0 group-hover:opacity-100 transition-opacity"
                          title={t('tools.passwordGenerator.delete')}
                        >
                          <span className="material-symbols-outlined text-base" style={{ color: 'var(--nb-accent-pink)' }}>delete</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </ToolCard>
  );
};
