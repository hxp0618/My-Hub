import React, { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ToolCard } from '../../../../components/ToolCard';
import { TOOL_METADATA } from '../../../../types/tools';
import { ToolId, ToolComponentProps } from '../../../../types/tools';
import { useCopyToClipboard } from '../../../../hooks/useCopyToClipboard';
import { useInputHistory } from '../../../../hooks/useInputHistory';
import { InputHistoryDropdown } from '../../../../components/InputHistoryDropdown';
import { CryptoService, Algorithm, AESMode } from '../../../../services/cryptoService';

/**
 * 文本加密解密工具组件
 */
export const TextCryptorTool: React.FC<ToolComponentProps> = ({
  isExpanded,
  onToggleExpand,
}) => {
  const { t } = useTranslation();
  const { copy } = useCopyToClipboard();
  const [mode, setMode] = useState<'encrypt' | 'decrypt'>('encrypt');
  const [textInput, setTextInput] = useState('');
  const [password, setPassword] = useState('');
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  
  // 加密算法和模式
  const [algorithm, setAlgorithm] = useState<Algorithm>('AES-256');
  const [aesMode, setAesMode] = useState<AESMode>('CBC');
  const [detectedAlgorithm, setDetectedAlgorithm] = useState<Algorithm | null>(null);

  // 历史记录 Hook
  const { addToHistory } = useInputHistory({
    toolId: 'text-cryptor',
  });

  // 处理历史记录选择
  const handleHistorySelect = useCallback((content: string) => {
    setTextInput(content);
  }, []);

  // 检测输入的密文算法
  useEffect(() => {
    if (mode === 'decrypt' && textInput) {
      const detected = CryptoService.detectAlgorithm(textInput);
      setDetectedAlgorithm(detected);
      if (detected) {
        setAlgorithm(detected);
        const parsed = CryptoService.parseEncryptedData(textInput);
        if (parsed?.mode) {
          setAesMode(parsed.mode);
        }
      }
    } else {
      setDetectedAlgorithm(null);
    }
  }, [mode, textInput]);

  // 处理加密/解密
  const handleProcess = useCallback(() => {
    if (!textInput.trim()) {
      setError(t('tools.textCryptor.emptyInput'));
      setOutput('');
      return;
    }

    if (!password.trim()) {
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
      } else {
        const decrypted = CryptoService.decrypt(textInput, password);
        setOutput(decrypted);
        setError('');
        addToHistory(textInput);
      }
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      setError(errorMessage);
      setOutput('');
    }
  }, [textInput, password, mode, algorithm, aesMode, t, addToHistory]);

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
    setDetectedAlgorithm(null);
  };

  // 切换模式时清空内容
  const handleModeChange = (newMode: 'encrypt' | 'decrypt') => {
    setMode(newMode);
    setTextInput('');
    setPassword('');
    setOutput('');
    setError('');
    setDetectedAlgorithm(null);
  };

  const isAES = CryptoService.isAESAlgorithm(algorithm);

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
              mode === 'encrypt'
                ? 'nb-btn-primary'
                : 'nb-btn-secondary'
            }`}
          >
            {t('tools.textCryptor.encrypt')}
          </button>
          <button
            onClick={() => handleModeChange('decrypt')}
            className={`nb-btn text-sm ${
              mode === 'decrypt'
                ? 'nb-btn-primary'
                : 'nb-btn-secondary'
            }`}
          >
            {t('tools.textCryptor.decrypt')}
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
              : t('tools.textCryptor.decrypt')}
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

        {/* 算法选择 */}
        <div className="flex gap-4 flex-shrink-0 items-center">
          <div className="flex items-center gap-2">
            <label className="text-sm nb-text-secondary">
              {t('tools.textCryptor.algorithm')}:
            </label>
            <select
              value={algorithm}
              onChange={e => setAlgorithm(e.target.value as Algorithm)}
              disabled={mode === 'decrypt' && detectedAlgorithm !== null}
              className="nb-input text-sm disabled:opacity-50"
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
                disabled={mode === 'decrypt' && detectedAlgorithm !== null}
                className="nb-input text-sm disabled:opacity-50"
              >
                {CryptoService.getSupportedAESModes().map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
          )}
          
          {/* 自动检测提示 */}
          {mode === 'decrypt' && detectedAlgorithm && (
            <span className="text-xs" style={{ color: 'var(--nb-accent-green)' }}>
              {t('tools.textCryptor.algorithmDetected', { algorithm: detectedAlgorithm })}
            </span>
          )}
        </div>

        {/* 密码输入 */}
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

        {/* 安全提示 */}
        <div className="p-2 nb-bg-card nb-border rounded-lg flex-shrink-0" style={{ borderColor: 'var(--nb-accent-blue)' }}>
          <p className="text-xs" style={{ color: 'var(--nb-accent-blue)' }}>
            {t('tools.textCryptor.securityNote')}
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
              {mode === 'encrypt'
                ? t('tools.textCryptor.inputPlaintext')
                : t('tools.textCryptor.inputCiphertext')}
            </label>
            <textarea
              value={textInput}
              onChange={e => setTextInput(e.target.value)}
              placeholder={
                mode === 'encrypt'
                  ? t('tools.textCryptor.plaintextPlaceholder')
                  : t('tools.textCryptor.ciphertextPlaceholder')
              }
              className="nb-input flex-1 font-mono text-sm resize-none"
            />
          </div>

          <div className="flex flex-col min-h-0">
            <label className="block text-sm font-medium nb-text mb-2 flex-shrink-0">
              {mode === 'encrypt'
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
