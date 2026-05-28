import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { parseCurl } from '../utils/curlUtils';
import { CurlParseError, CurlParseSuccess } from '../types/curl';
import { Modal } from './Modal';

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

  const getParseErrorMessage = useCallback(
    (result: CurlParseError) => {
      return t(`tools.httpTester.curlErrors.${result.error}`, result.values);
    },
    [t]
  );

  const handleImport = useCallback(() => {
    const result = parseCurl(curlCommand);
    
    if (result.success) {
      onImport(result.data);
      setCurlCommand('');
      setError(null);
      onClose();
    } else {
      setError(getParseErrorMessage(result));
    }
  }, [curlCommand, getParseErrorMessage, onImport, onClose]);

  const handleClose = useCallback(() => {
    setCurlCommand('');
    setError(null);
    onClose();
  }, [onClose]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={t('tools.httpTester.importCurl')}
      widthClass="max-w-2xl"
    >
      <p className="text-sm nb-text-secondary mb-4">
        {t('tools.httpTester.importCurlDescription')}
      </p>

      <textarea
        value={curlCommand}
        onChange={(e) => {
          setCurlCommand(e.target.value);
          setError(null);
        }}
        placeholder={t('tools.httpTester.curlPlaceholder')}
        className={`nb-input w-full min-h-[200px] font-mono text-sm resize-none ${
          error ? 'border-[color:var(--nb-accent-pink)]' : ''
        }`}
      />

      {error && (
        <p className="text-sm mt-2" style={{ color: 'var(--color-error-text)' }}>
          {error}
        </p>
      )}

      <div className="flex justify-end gap-3 mt-4">
        <button
          type="button"
          onClick={handleClose}
          className="nb-btn nb-btn-ghost"
        >
          {t('common.cancel')}
        </button>
        <button
          type="button"
          onClick={handleImport}
          disabled={!curlCommand.trim()}
          className="nb-btn nb-btn-primary"
        >
          {t('tools.httpTester.import')}
        </button>
      </div>
    </Modal>
  );
};
