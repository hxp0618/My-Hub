import i18n from '../i18n';

export interface ErrorInfo {
  title: string;
  message: string;
  action?: string;
  actionLink?: string;
}

export type ErrorMessageKey =
  | 'noApiKey'
  | 'networkError'
  | 'unauthorized'
  | 'rateLimit'
  | 'serverError'
  | 'geminiNanoUnavailable'
  | 'operationCancelled'
  | 'generic';

type Translate = (key: string) => string;

const getTranslatedErrorInfo = (key: ErrorMessageKey, t: Translate): ErrorInfo => {
  const info: ErrorInfo = {
    title: t(`errors.${key}.title`),
    message: t(`errors.${key}.message`),
  };
  const action = t(`errors.${key}.action`);
  if (action !== `errors.${key}.action`) {
    info.action = action;
  }
  if (key === 'noApiKey' || key === 'unauthorized') {
    info.actionLink = '/settings';
  }
  return info;
};

export const getErrorMessageKey = (error: Error | unknown): ErrorMessageKey => {
  const errorMsg = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();

  // API Key 错误
  if (errorMsg.includes('api key') || errorMsg.includes('未配置') || errorMsg.includes('not configured')) {
    return 'noApiKey';
  }

  // 网络错误
  if (errorMsg.includes('network') || errorMsg.includes('fetch failed') || errorMsg.includes('failed to fetch')) {
    return 'networkError';
  }

  // 401 认证失败
  if (errorMsg.includes('401') || errorMsg.includes('unauthorized')) {
    return 'unauthorized';
  }

  // 429 限流
  if (errorMsg.includes('429') || errorMsg.includes('rate limit') || errorMsg.includes('too many requests')) {
    return 'rateLimit';
  }

  // 500 服务器错误
  if (errorMsg.includes('500') || errorMsg.includes('internal server') || errorMsg.includes('503')) {
    return 'serverError';
  }

  // Gemini Nano 不可用
  if (errorMsg.includes('gemini nano') || errorMsg.includes('prompt api') || errorMsg.includes('languagemodel')) {
    return 'geminiNanoUnavailable';
  }

  // Abort 错误（用户取消）
  if (errorMsg.includes('abort') || errorMsg.includes('cancelled')) {
    return 'operationCancelled';
  }

  return 'generic';
};

export const getErrorMessage = (
  error: Error | unknown,
  t: Translate = (key) => i18n.t(key)
): ErrorInfo => {
  const key = getErrorMessageKey(error);
  return getTranslatedErrorInfo(key, t);
};
