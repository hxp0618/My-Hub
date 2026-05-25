const DEFAULT_FAVICON =
  'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"%3E%3Crect width="32" height="32" rx="8" fill="%23f8d773"/%3E%3Cpath d="M8 17h16v4H8zm0-6h16v4H8z" fill="%23242425"/%3E%3C/svg%3E';

export const getUrlHostname = (url?: string): string => {
  if (!url) return '';

  try {
    return new URL(url).hostname;
  } catch {
    // 历史记录里可能出现 chrome://、about:blank 或临时 URL，无法解析时隐藏域名。
    return '';
  }
};

export const getFaviconUrl = (url?: string, size = 32): string => {
  const hostname = getUrlHostname(url);

  if (!hostname) {
    return DEFAULT_FAVICON;
  }

  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(hostname)}&sz=${size}`;
};

