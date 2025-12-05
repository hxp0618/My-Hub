export interface ErrorInfo {
  title: string;
  message: string;
  action?: string;
  actionLink?: string;
}

export const getErrorMessage = (error: Error | unknown): ErrorInfo => {
  const errorMsg = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();

  // API Key 错误
  if (errorMsg.includes('api key') || errorMsg.includes('未配置') || errorMsg.includes('not configured')) {
    return {
      title: '未配置 API Key',
      message: '请先在设置页面配置您的 LLM 服务商和 API Key',
      action: '前往设置',
      actionLink: '/settings'
    };
  }

  // 网络错误
  if (errorMsg.includes('network') || errorMsg.includes('fetch failed') || errorMsg.includes('failed to fetch')) {
    return {
      title: '网络连接失败',
      message: '请检查您的网络连接是否正常，然后重试',
      action: '重试'
    };
  }

  // 401 认证失败
  if (errorMsg.includes('401') || errorMsg.includes('unauthorized')) {
    return {
      title: 'API Key 无效',
      message: '您的 API Key 可能已过期或不正确，请重新配置',
      action: '前往设置',
      actionLink: '/settings'
    };
  }

  // 429 限流
  if (errorMsg.includes('429') || errorMsg.includes('rate limit') || errorMsg.includes('too many requests')) {
    return {
      title: '请求过于频繁',
      message: '您已达到 API 调用限制，请稍后再试',
      action: '了解更多'
    };
  }

  // 500 服务器错误
  if (errorMsg.includes('500') || errorMsg.includes('internal server') || errorMsg.includes('503')) {
    return {
      title: '服务暂时不可用',
      message: 'LLM 服务提供商出现问题，请稍后重试',
      action: '重试'
    };
  }

  // Gemini Nano 不可用
  if (errorMsg.includes('gemini nano') || errorMsg.includes('prompt api') || errorMsg.includes('languagemodel')) {
    return {
      title: '本地 AI 不可用',
      message: '您的浏览器不支持本地 AI，已自动切换到云端服务',
      action: undefined
    };
  }

  // Abort 错误（用户取消）
  if (errorMsg.includes('abort') || errorMsg.includes('cancelled')) {
    return {
      title: '操作已取消',
      message: '您已取消当前操作',
      action: undefined
    };
  }

  // 通用错误
  return {
    title: '操作失败',
    message: error instanceof Error ? error.message : '发生未知错误，请重试',
    action: '重试'
  };
};
