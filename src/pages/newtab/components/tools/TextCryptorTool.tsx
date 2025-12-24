import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import CryptoJS from 'crypto-js';
import { ToolCard } from '../../../../components/ToolCard';
import { TOOL_METADATA } from '../../../../types/tools';
import { ToolId, ToolComponentProps } from '../../../../types/tools';
import { useCopyToClipboard } from '../../../../hooks/useCopyToClipboard';
import { useInputHistory } from '../../../../hooks/useInputHistory';
import { InputHistoryDropdown } from '../../../../components/InputHistoryDropdown';
import { CryptoService, Algorithm, AESMode } from '../../../../services/cryptoService';

type CryptoMode = 'encrypt' | 'decrypt' | 'md5';

/**
 * 文本加密解密工具组件
 */
export const TextCryptorTool: React.FC<ToolComponentProps> = ({
  isExpanded,
  onToggleExpand,
}) => {
  const { t } = useTranslation();
  const { copy } = useCopyToClipboard();
  const [mode, setMode] = useState<CryptoMode>('encrypt');
  const [textInput, setTextInput] = useState('');
  const [password, setPassword] = useState('');
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const [uppercase, setUppercase] = useState(false);
  
  // 加密算法和模式
  const [algorithm, setAlgorithm] = useState<Algorithm>('AES-256');
  const [aesMode, setAesMode] = useState<AESMode>('CBC');

  // 历史记录 Hook
  const { addToHistory } = useInputHistory({
    toolId: 'text-cryptor',
  });

  // 处理历史记录选择
  const handleHistorySelect = useCallback((content: string) => {
    setTextInput(content);
  }, []);

  // 处理加密/解密/MD5
  const handleProcess = useCallback(() => {
    if (!textInput.trim()) {
      setError(t('tools.textCryptor.emptyInput'));
      setOutput('');
      return;
    }

    // MD5 不需要密码
    if (mode !== 'md5' && !password.trim()) {
      setError(t('tools.textCryptor.emptyPassword'));
      setOutput('');
      return;
    }

    try {
      if (mode === 'encrypt') {
        const encrypted = CryptoService.encrypt(textInput, {
          algorithm,
          mode: CryptoService.isAESAlgorithm(algorithm) ? aesMode : undefined,
          password,
        });
        setOutput(encrypted);
        setError('');
        addToHistory(textInput);
      } else if (mode === 'decrypt') {
        const decrypted = CryptoService.decrypt(textInput, password, {
          algorithm,
          mode: CryptoService.isAESAlgorithm(algorithm) ? aesMode : undefined,
        });
        setOutput(decrypted);
        setError('');
        addToHistory(textInput);
      } else if (mode === 'md5') {
        const hash = CryptoJS.MD5(textInput).toString();
        setOutput(uppercase ? hash.toUpperCase() : hash);
        setError('');
        addToHistory(textInput);
      }
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      setError(errorMessage);
      setOutput('');
    }
  }, [textInput, password, mode, algorithm, aesMode, uppercase, t, addToHistory]);

  // 复制到剪贴板
  const handleCopy = useCallback(() => {
    copy(output);
  }, [output, copy]);

  // 清空
  const handleClear = () => {
    setTextInput('');
    setPassword('');
    setOutput('');
    setError('');
  };

  // 切换模式时清空内容
  const handleModeChange = (newMode: CryptoMode) => {
    setMode(newMode);
    setTextInput('');
    setPassword('');
    setOutput('');
    setError('');
  };

  const isAES = CryptoService.isAESAlgorithm(algorithm);
  const isMD5 = mode === 'md5';

  return (
    <ToolCard
      tool={TOOL_METADATA[ToolId.TEXT_CRYPTOR]}
      isExpanded={isExpanded}
      onToggleExpand={onToggleExpand}
    >
      <div className="h-full flex flex-col gap-4">
        {/* 模式切换和操作按钮 */}
        <div className="flex gap-2 flex-wrap flex-shrink-0 items-center">
          <button
            onClick={() => handleModeChange('encrypt')}
            className={`nb-btn text-sm ${
              mode === 'encrypt' ? 'nb-btn-primary' : 'nb-btn-secondary'
            }`}
          >
            {t('tools.textCryptor.encrypt')}
          </button>
          <button
            onClick={() => handleModeChange('decrypt')}
            className={`nb-btn text-sm ${
              mode === 'decrypt' ? 'nb-btn-primary' : 'nb-btn-secondary'
            }`}
          >
            {t('tools.textCryptor.decrypt')}
          </button>
          <button
            onClick={() => handleModeChange('md5')}
            className={`nb-btn text-sm ${
              mode === 'md5' ? 'nb-btn-primary' : 'nb-btn-secondary'
            }`}
          >
            MD5
          </button>
          
          <div className="flex-1"></div>
          
          {/* 历史记录 */}
          <InputHistoryDropdown
            toolId="text-cryptor"
            onSelect={handleHistorySelect}
          />
          
          <button
            onClick={handleProcess}
            className="nb-btn nb-btn-primary text-sm"
          >
            {mode === 'encrypt'
              ? t('tools.textCryptor.encrypt')
              : mode === 'decrypt'
              ? t('tools.textCryptor.decrypt')
              : t('tools.textCryptor.calculate')}
          </button>
          <button
            onClick={handleCopy}
            disabled={!output}
            className="nb-btn nb-btn-secondary text-sm"
          >
            {t('tools.textCryptor.copy')}
          </button>
          <button
            onClick={handleClear}
            className="nb-btn nb-btn-ghost text-sm"
          >
            {t('tools.textCryptor.clear')}
          </button>
        </div>

        {/* 算法选择（非 MD5 模式） */}
        {!isMD5 && (
          <div className="flex gap-4 flex-shrink-0 items-center">
            <div className="flex items-center gap-2">
              <label className="text-sm nb-text-secondary">
                {t('tools.textCryptor.algorithm')}:
              </label>
              <select
                value={algorithm}
                onChange={e => setAlgorithm(e.target.value as Algorithm)}
                className="nb-input text-sm"
              >
                {CryptoService.getSupportedAlgorithms().map(alg => (
                  <option key={alg} value={alg}>{alg}</option>
                ))}
              </select>
            </div>
            
            {/* AES 模式选择（仅 AES 算法显示） */}
            {isAES && (
              <div className="flex items-center gap-2">
                <label className="text-sm nb-text-secondary">
                  {t('tools.textCryptor.mode')}:
                </label>
                <select
                  value={aesMode}
                  onChange={e => setAesMode(e.target.value as AESMode)}
                  className="nb-input text-sm"
                >
                  {CryptoService.getSupportedAESModes().map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}

        {/* MD5 选项 */}
        {isMD5 && (
          <div className="flex gap-4 flex-shrink-0 items-center">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={uppercase}
                onChange={e => setUppercase(e.target.checked)}
                className="w-4 h-4 rounded nb-border accent-[var(--nb-accent-yellow)]"
              />
              <span className="text-sm nb-text">{t('tools.textCryptor.uppercase')}</span>
            </label>
          </div>
        )}

        {/* 密码输入（非 MD5 模式） */}
        {!isMD5 && (
          <div className="flex-shrink-0">
            <label className="block text-sm font-medium nb-text mb-2">
              {t('tools.textCryptor.password')}
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder={t('tools.textCryptor.passwordPlaceholder')}
              className="nb-input w-full text-sm"
            />
          </div>
        )}

        {/* 安全提示 */}
        <div className="p-2 nb-bg-card nb-border rounded-lg flex-shrink-0" style={{ borderColor: 'var(--nb-accent-blue)' }}>
          <p className="text-xs" style={{ color: 'var(--nb-accent-blue)' }}>
            {isMD5 ? t('tools.textCryptor.md5Note') : t('tools.textCryptor.securityNote')}
          </p>
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="p-3 nb-bg-card nb-border rounded-lg flex-shrink-0" style={{ borderColor: 'var(--nb-accent-pink)' }}>
            <p className="text-sm" style={{ color: 'var(--nb-accent-pink)' }}>{error}</p>
          </div>
        )}

        {/* 输入输出区域 */}
        <div className="flex-1 grid grid-cols-2 gap-4 min-h-0">
          <div className="flex flex-col min-h-0">
            <label className="block text-sm font-medium nb-text mb-2 flex-shrink-0">
              {isMD5
                ? t('tools.textCryptor.inputText')
                : mode === 'encrypt'
                ? t('tools.textCryptor.inputPlaintext')
                : t('tools.textCryptor.inputCiphertext')}
            </label>
            <textarea
              value={textInput}
              onChange={e => setTextInput(e.target.value)}
              placeholder={
                isMD5
                  ? t('tools.textCryptor.md5Placeholder')
                  : mode === 'encrypt'
                  ? t('tools.textCryptor.plaintextPlaceholder')
                  : t('tools.textCryptor.ciphertextPlaceholder')
              }
              className="nb-input flex-1 font-mono text-sm resize-none"
            />
          </div>

          <div className="flex flex-col min-h-0">
            <label className="block text-sm font-medium nb-text mb-2 flex-shrink-0">
              {isMD5
                ? t('tools.textCryptor.md5Result')
                : mode === 'encrypt'
                ? t('tools.textCryptor.outputCiphertext')
                : t('tools.textCryptor.outputPlaintext')}
            </label>
            <textarea
              value={output}
              readOnly
              className="nb-input flex-1 font-mono text-sm resize-none nb-bg"
            />
          </div>
        </div>
      </div>
    </ToolCard>
  );
};
