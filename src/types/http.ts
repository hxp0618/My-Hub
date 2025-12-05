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
