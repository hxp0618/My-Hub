import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useToastContext } from '../contexts/ToastContext';
import { copyToClipboard } from '../utils/clipboard';

/**
 * 复制到剪贴板的自定义 Hook
 * 自动处理 Toast 提示
 */
export const useCopyToClipboard = () => {
  const { t } = useTranslation();
  const toast = useToastContext();

  const copy = useCallback(
    async (text: string, customSuccessMessage?: string) => {
      if (!text) {
        toast.error(t('tools.copyEmpty'));
        return false;
      }

      const success = await copyToClipboard(text);

      if (success) {
        toast.success(customSuccessMessage || t('tools.copySuccess'));
      } else {
        toast.error(t('tools.copyError'));
      }

      return success;
    },
    [t, toast]
  );

  return { copy };
};
