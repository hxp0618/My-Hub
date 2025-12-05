/**
 * curl 工具函数
 * 提供 curl 命令解析和生成功能
 */

import { HttpMethod, HeaderEntry, HTTP_METHODS, METHODS_WITH_BODY } from '../types/http';
import { CurlParseResult, CurlGenerateOptions } from '../types/curl';
import { isValidUrl } from './httpUtils';

/** 支持的数据参数 */
const DATA_PARAMS = ['-d', '--data', '--data-raw', '--data-binary'];

/**
 * 规范化 curl 命令
 * 处理多行命令（反斜杠换行）合并和多余空白字符
 * @param curlCommand - 原始 curl 命令
 * @returns 规范化后的命令
 */
export function normalizeCurlCommand(curlCommand: string): string {
  if (!curlCommand || typeof curlCommand !== 'string') {
    return '';
  }

  // 移除行尾反斜杠和换行符，合并为单行
  let normalized = curlCommand
    .replace(/\\\r?\n/g, ' ')  // 处理反斜杠换行
    .replace(/\r?\n/g, ' ')    // 处理普通换行
    .replace(/\s+/g, ' ')      // 合并多个空白字符
    .trim();

  return normalized;
}

/**
 * 分词 curl 命令
 * 处理单引号、双引号包裹的参数和转义字符
 * @param command - 规范化后的命令
 * @returns 参数数组
 */
export function tokenizeCurlCommand(command: string): string[] {
  const tokens: string[] = [];
  let current = '';
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let escaped = false;

  for (let i = 0; i < command.length; i++) {
    const char = command[i];

    if (escaped) {
      // 处理转义字符
      current += char;
      escaped = false;
      continue;
    }

    if (char === '\\' && !inSingleQuote) {
      // 在单引号外，反斜杠是转义字符
      escaped = true;
      continue;
    }

    if (char === "'" && !inDoubleQuote) {
      // 单引号切换
      inSingleQuote = !inSingleQuote;
      continue;
    }

    if (char === '"' && !inSingleQuote) {
      // 双引号切换
      inDoubleQuote = !inDoubleQuote;
      continue;
    }

    if (char === ' ' && !inSingleQuote && !inDoubleQuote) {
      // 空格分隔 token
      if (current) {
        tokens.push(current);
        current = '';
      }
      continue;
    }

    current += char;
  }

  // 添加最后一个 token
  if (current) {
    tokens.push(current);
  }

  return tokens;
}


/**
 * 解析 curl 命令字符串
 * @param curlCommand - curl 命令字符串
 * @returns 解析结果
 */
export function parseCurl(curlCommand: string): CurlParseResult {
  // 规范化命令
  const normalized = normalizeCurlCommand(curlCommand);
  
  if (!normalized) {
    return { success: false, error: '命令不能为空' };
  }

  // 分词
  const tokens = tokenizeCurlCommand(normalized);
  
  if (tokens.length === 0) {
    return { success: false, error: '命令不能为空' };
  }

  // 验证以 curl 开头
  if (tokens[0].toLowerCase() !== 'curl') {
    return { success: false, error: "命令必须以 'curl' 开头" };
  }

  // 解析状态
  let url: string | null = null;
  let method: HttpMethod | null = null;
  const headers: HeaderEntry[] = [];
  let body: string = '';
  let hasData = false;

  // 遍历 tokens 解析参数
  let i = 1; // 跳过 'curl'
  while (i < tokens.length) {
    const token = tokens[i];

    // 解析 HTTP 方法
    if (token === '-X' || token === '--request') {
      i++;
      if (i < tokens.length) {
        const methodValue = tokens[i].toUpperCase() as HttpMethod;
        if (HTTP_METHODS.includes(methodValue)) {
          method = methodValue;
        } else {
          return {
            success: false,
            error: `不支持的 HTTP 方法: ${tokens[i]}，支持的方法: ${HTTP_METHODS.join(', ')}`,
          };
        }
      }
      i++;
      continue;
    }

    // 解析请求头
    if (token === '-H' || token === '--header') {
      i++;
      if (i < tokens.length) {
        const headerValue = tokens[i];
        const colonIndex = headerValue.indexOf(':');
        if (colonIndex > 0) {
          const key = headerValue.substring(0, colonIndex).trim();
          const value = headerValue.substring(colonIndex + 1).trim();
          headers.push({ key, value, enabled: true });
        }
        // 无效格式的请求头被忽略
      }
      i++;
      continue;
    }

    // 解析请求体
    if (DATA_PARAMS.includes(token)) {
      i++;
      if (i < tokens.length) {
        body = tokens[i];
        hasData = true;
      }
      i++;
      continue;
    }

    // 跳过其他常见参数
    if (token.startsWith('-')) {
      // 检查是否是带值的参数
      if (
        token === '-u' || token === '--user' ||
        token === '-A' || token === '--user-agent' ||
        token === '-e' || token === '--referer' ||
        token === '-o' || token === '--output' ||
        token === '--connect-timeout' ||
        token === '-m' || token === '--max-time'
      ) {
        i += 2; // 跳过参数和值
        continue;
      }
      // 其他单独的参数（如 -k, -v, -s 等）
      i++;
      continue;
    }

    // 尝试解析为 URL
    if (!url && (token.startsWith('http://') || token.startsWith('https://') || isValidUrl(token))) {
      url = token;
      i++;
      continue;
    }

    // 未知 token，可能是 URL
    if (!url) {
      // 尝试作为 URL
      if (isValidUrl(token)) {
        url = token;
      }
    }
    i++;
  }

  // 验证 URL
  if (!url) {
    return { success: false, error: '命令中未找到有效的 URL' };
  }

  if (!isValidUrl(url)) {
    return { success: false, error: 'URL 格式无效，请检查 URL 是否正确' };
  }

  // 推断 HTTP 方法
  if (!method) {
    method = hasData ? 'POST' : 'GET';
  }

  return {
    success: true,
    data: {
      url,
      method,
      headers: headers.length > 0 ? headers : [{ key: '', value: '', enabled: true }],
      body,
    },
  };
}


/**
 * 转义 shell 参数中的特殊字符
 * 使用单引号包裹，并转义内部的单引号
 * @param value - 原始字符串
 * @returns 转义后的字符串（包含引号）
 */
export function escapeShellArg(value: string): string {
  // 如果值中包含单引号，需要特殊处理
  // 方法：结束当前单引号，添加转义的单引号，再开始新的单引号
  // 例如: it's -> 'it'\''s'
  if (value.includes("'")) {
    return "'" + value.replace(/'/g, "'\\''") + "'";
  }
  return "'" + value + "'";
}

/**
 * 生成 curl 命令字符串
 * @param options - 请求参数
 * @returns curl 命令字符串
 */
export function generateCurl(options: CurlGenerateOptions): string {
  const { url, method, headers, body } = options;
  
  const parts: string[] = ['curl'];
  
  // 添加 HTTP 方法（GET 可以省略，但为了明确性还是加上）
  parts.push('-X', method);
  
  // 添加 URL
  parts.push(escapeShellArg(url));
  
  // 添加请求头
  for (const header of headers) {
    if (header.enabled && header.key.trim()) {
      const headerValue = `${header.key}: ${header.value}`;
      parts.push('-H', escapeShellArg(headerValue));
    }
  }
  
  // 添加请求体
  if (body && METHODS_WITH_BODY.includes(method)) {
    parts.push('-d', escapeShellArg(body));
  }
  
  return parts.join(' ');
}
