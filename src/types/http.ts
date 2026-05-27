/**
 * HTTP 相关类型定义
 * 用于 HTTP URL 测试工具
 */

/**
 * HTTP 请求方法
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

/**
 * 所有支持的 HTTP 方法列表
 */
export const HTTP_METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];

/**
 * 需要请求体的 HTTP 方法
 */
export const METHODS_WITH_BODY: HttpMethod[] = ['POST', 'PUT', 'PATCH'];

/**
 * 请求头条目
 */
export interface HeaderEntry {
  key: string;
  value: string;
  enabled: boolean;
}

/**
 * 请求状态
 */
export interface RequestState {
  url: string;
  method: HttpMethod;
  headers: HeaderEntry[];
  body: string;
}

/**
 * 响应状态
 */
export interface ResponseState {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  time: number;
  size: number;
  error?: string;
}

/**
 * HTTP 请求选项
 */
export interface HttpRequestOptions {
  url: string;
  method: HttpMethod;
  headers?: Record<string, string>;
  body?: string;
}

/**
 * HTTP 响应结果
 */
export interface HttpResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  time: number;
  size: number;
}

/**
 * 历史记录条目
 */
export interface HistoryEntry {
  id: string;
  timestamp: number;
  request: {
    url: string;
    method: HttpMethod;
    headers: HeaderEntry[];
    body: string;
  };
  response?: {
    status: number;
    statusText: string;
    time: number;
  };
}

/**
 * 状态码颜色类型
 */
export type StatusColor = 'green' | 'red' | 'yellow';

/**
 * JSON 验证结果
 */
export interface JsonValidationResult {
  valid: boolean;
  error?: string;
}

const SENSITIVE_HTTP_HEADER_NAMES = new Set([
  'authorization',
  'proxy-authorization',
  'cookie',
  'set-cookie',
  'x-api-key',
  'api-key',
  'apikey',
  'x-auth-token',
  'x-csrf-token',
  'x-xsrf-token',
]);

const isRecord = (value: unknown): value is Record<string, unknown> => (
  !!value && typeof value === 'object' && !Array.isArray(value)
);

export function isHttpMethodValue(value: unknown): value is HttpMethod {
  return typeof value === 'string' && HTTP_METHODS.includes(value as HttpMethod);
}

export function sanitizeHeaderEntries(value: unknown): HeaderEntry[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((header): HeaderEntry[] => {
    if (
      !isRecord(header) ||
      typeof header.key !== 'string' ||
      typeof header.value !== 'string' ||
      typeof header.enabled !== 'boolean'
    ) {
      return [];
    }

    return [{
      key: header.key,
      value: header.value,
      enabled: header.enabled,
    }];
  });
}

export function isSensitiveHttpHeaderName(value: string): boolean {
  return SENSITIVE_HTTP_HEADER_NAMES.has(value.trim().toLowerCase());
}

export function redactSensitiveHeaderEntriesForHistory(headers: HeaderEntry[]): HeaderEntry[] {
  return headers.map((header) => (
    isSensitiveHttpHeaderName(header.key)
      ? { ...header, value: '', enabled: false }
      : header
  ));
}

export function sanitizeHttpHistoryEntry(value: unknown): HistoryEntry | null {
  if (!isRecord(value) || !isRecord(value.request)) {
    return null;
  }

  const { id, timestamp, request, response } = value;
  if (
    typeof id !== 'string' ||
    id.trim().length === 0 ||
    typeof timestamp !== 'number' ||
    !Number.isFinite(timestamp) ||
    typeof request.url !== 'string' ||
    request.url.trim().length === 0 ||
    !isHttpMethodValue(request.method) ||
    typeof request.body !== 'string'
  ) {
    return null;
  }

  const sanitized: HistoryEntry = {
    id,
    timestamp,
    request: {
      url: request.url,
      method: request.method,
      headers: redactSensitiveHeaderEntriesForHistory(sanitizeHeaderEntries(request.headers)),
      body: request.body,
    },
  };

  if (
    isRecord(response) &&
    typeof response.status === 'number' &&
    Number.isFinite(response.status) &&
    typeof response.statusText === 'string' &&
    typeof response.time === 'number' &&
    Number.isFinite(response.time)
  ) {
    sanitized.response = {
      status: response.status,
      statusText: response.statusText,
      time: response.time,
    };
  }

  return sanitized;
}

export function sanitizeHttpHistoryEntries(value: unknown, maxEntries = 10): HistoryEntry[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const limit = Number.isInteger(maxEntries) && maxEntries > 0 ? maxEntries : 10;
  const seenIds = new Set<string>();
  const entries: HistoryEntry[] = [];

  for (const item of value) {
    const entry = sanitizeHttpHistoryEntry(item);
    if (!entry || seenIds.has(entry.id)) {
      continue;
    }
    entries.push(entry);
    seenIds.add(entry.id);
  }

  return entries
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, limit);
}
