import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { parseCurl } from '../utils/curlUtils';
import { CurlParseSuccess } from '../types/curl';

interface CurlImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (data: CurlParseSuccess['data']) => void;
}

/**
 * curl 命令导入对话框组件
 * 使用 Neo-Brutalism 设计风格
 */
export const CurlImportModal: React.FC<CurlImportModalProps> = ({
  isOpen,
  onClose,
  onImport,
}) => {
  const { t } = useTranslation();
  const [curlCommand, setCurlCommand] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleImport = useCallback(() => {
    const result = parseCurl(curlCommand);
    
    if (result.success) {
      onImport(result.data);
      setCurlCommand('');
      setError(null);
      onClose();
    } else {
      setError(result.error);
    }
  }, [curlCommand, onImport, onClose]);

  const handleClose = useCallback(() => {
    setCurlCommand('');
    setError(null);
    onClose();
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 背景遮罩 */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={handleClose}
      />
      
      {/* 对话框 */}
      <div className="relative nb-card p-6 w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col">
        {/* 标题栏 */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold nb-text">
            {t('tools.httpTester.importCurl')}
          </h2>
          <button
            onClick={handleClose}
            className="nb-btn nb-btn-ghost p-1"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* 说明文字 */}
        <p className="text-sm nb-text-secondary mb-4">
          {t('tools.httpTester.importCurlDescription')}
        </p>

        {/* curl 命令输入框 */}
        <textarea
          value={curlCommand}
          onChange={(e) => {
            setCurlCommand(e.target.value);
            setError(null);
          }}
          placeholder={t('tools.httpTester.curlPlaceholder')}
          className={`nb-input flex-1 min-h-[200px] font-mono text-sm resize-none ${
            error ? 'border-[color:var(--nb-accent-pink)]' : ''
          }`}
        />

        {/* 错误提示 */}
        {error && (
          <p className="text-sm mt-2" style={{ color: 'var(--nb-accent-pink)' }}>
            {error}
          </p>
        )}

        {/* 按钮区域 */}
        <div className="flex justify-end gap-3 mt-4">
          <button
            onClick={handleClose}
            className="nb-btn nb-btn-ghost"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={handleImport}
            disabled={!curlCommand.trim()}
            className="nb-btn nb-btn-primary"
          >
            {t('tools.httpTester.import')}
          </button>
        </div>
      </div>
    </div>
  );
};
