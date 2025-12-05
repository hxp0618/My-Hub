/**
 * curl 相关类型定义
 * 用于 curl 命令解析和生成功能
 */

import { HttpMethod, HeaderEntry } from './http';

/**
 * curl 解析成功结果
 */
export interface CurlParseSuccess {
  success: true;
  data: {
    url: string;
    method: HttpMethod;
    headers: HeaderEntry[];
    body: string;
  };
}

/**
 * curl 解析失败结果
 */
export interface CurlParseError {
  success: false;
  error: string;
}

/**
 * curl 解析结果（联合类型）
 */
export type CurlParseResult = CurlParseSuccess | CurlParseError;

/**
 * curl 命令生成选项
 */
export interface CurlGenerateOptions {
  url: string;
  method: HttpMethod;
  headers: HeaderEntry[];
  body?: string;
}

/**
 * curl 参数类型
 */
export type CurlTokenType =
  | 'url'
  | 'method'
  | 'header'
  | 'data'
  | 'data-raw'
  | 'data-binary'
  | 'unknown';

/**
 * curl 解析 token
 */
export interface CurlToken {
  type: CurlTokenType;
  value: string;
}

/**
 * curl 解析中间状态
 */
export interface ParseState {
  url: string | null;
  method: HttpMethod | null;
  headers: Array<{ key: string; value: string }>;
  body: string | null;
  errors: string[];
}
