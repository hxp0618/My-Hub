/**
 * HTTP 工具函数
 * 提供 URL 验证、JSON 验证、状态码颜色映射等功能
 */

import { 
  StatusColor, 
  JsonValidationResult, 
  HeaderEntry,
  HttpRequestOptions,
  HttpResponse,
  METHODS_WITH_BODY
} from '../types/http';

/**
 * 验证 URL 是否有效
 * @param url - 要验证的 URL 字符串
 * @returns 如果 URL 有效返回 true，否则返回 false
 */
export function isValidUrl(url: string): boolean {
  if (!url || typeof url !== 'string') {
    return false;
  }
  
  const trimmedUrl = url.trim();
  if (!trimmedUrl) {
    return false;
  }
  
  try {
    const urlObj = new URL(trimmedUrl);
    // 只允许 http 和 https 协议
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * 验证 JSON 字符串是否有效
 * @param json - 要验证的 JSON 字符串
 * @returns 验证结果，包含 valid 和可选的 error
 */
export function isValidJson(json: string): JsonValidationResult {
  if (!json || typeof json !== 'string') {
    return { valid: true }; // 空字符串视为有效（可选的请求体）
  }
  
  const trimmedJson = json.trim();
  if (!trimmedJson) {
    return { valid: true }; // 空白字符串视为有效
  }
  
  try {
    JSON.parse(trimmedJson);
    return { valid: true };
  } catch (e) {
    return { 
      valid: false, 
      error: e instanceof Error ? e.message : 'Invalid JSON' 
    };
  }
}

/**
 * 根据 HTTP 状态码返回对应的颜色
 * @param status - HTTP 状态码
 * @returns 颜色标识：green（成功）、red（错误）、yellow（警告）
 */
export function getStatusColor(status: number): StatusColor {
  if (status >= 200 && status <= 299) {
    return 'green';
  }
  if (status >= 400 && status <= 599) {
    return 'red';
  }
  return 'yellow';
}

/**
 * 将 HeaderEntry 数组转换为 Record 对象
 * 只包含启用的请求头
 * @param headers - 请求头条目数组
 * @returns 请求头对象
 */
export function headersToRecord(headers: HeaderEntry[]): Record<string, string> {
  const result: Record<string, string> = {};
  for (const header of headers) {
    if (header.enabled && header.key.trim()) {
      result[header.key.trim()] = header.value;
    }
  }
  return result;
}

/**
 * 格式化响应大小
 * @param bytes - 字节数
 * @returns 格式化后的大小字符串
 */
export function formatSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(2)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * 格式化响应时间
 * @param ms - 毫秒数
 * @returns 格式化后的时间字符串
 */
export function formatTime(ms: number): string {
  if (ms < 1000) {
    return `${ms} ms`;
  }
  return `${(ms / 1000).toFixed(2)} s`;
}

/**
 * 尝试格式化 JSON 字符串
 * @param json - JSON 字符串
 * @returns 格式化后的 JSON 字符串，如果解析失败则返回原字符串
 */
export function formatJson(json: string): string {
  try {
    const parsed = JSON.parse(json);
    return JSON.stringify(parsed, null, 2);
  } catch {
    return json;
  }
}

/**
 * 检查内容是否为 JSON
 * @param content - 内容字符串
 * @param contentType - Content-Type 头
 * @returns 是否为 JSON
 */
export function isJsonContent(content: string, contentType?: string): boolean {
  if (contentType?.includes('application/json')) {
    return true;
  }
  try {
    JSON.parse(content);
    return true;
  } catch {
    return false;
  }
}

/**
 * 检查 HTTP 方法是否需要请求体
 * @param method - HTTP 方法
 * @returns 是否需要请求体
 */
export function methodNeedsBody(method: string): boolean {
  return METHODS_WITH_BODY.includes(method as any);
}

/**
 * 发送 HTTP 请求
 * @param options - 请求选项
 * @returns HTTP 响应
 */
export async function sendHttpRequest(options: HttpRequestOptions): Promise<HttpResponse> {
  const { url, method, headers = {}, body } = options;
  
  const startTime = performance.now();
  
  const fetchOptions: RequestInit = {
    method,
    headers: {
      ...headers,
    },
  };
  
  // 只有需要请求体的方法才添加 body
  if (methodNeedsBody(method) && body) {
    fetchOptions.body = body;
    // 如果没有设置 Content-Type，默认使用 application/json
    if (!headers['Content-Type'] && !headers['content-type']) {
      (fetchOptions.headers as Record<string, string>)['Content-Type'] = 'application/json';
    }
  }
  
  const response = await fetch(url, fetchOptions);
  const endTime = performance.now();
  
  const responseBody = await response.text();
  
  // 提取响应头
  const responseHeaders: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    responseHeaders[key] = value;
  });
  
  return {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders,
    body: responseBody,
    time: Math.round(endTime - startTime),
    size: new Blob([responseBody]).size,
  };
}

/**
 * 生成唯一 ID
 * @returns UUID 字符串
 */
export function generateId(): string {
  return crypto.randomUUID();
}
