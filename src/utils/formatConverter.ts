/**
 * 格式转换引擎
 * 支持 JSON、YAML、TOML 三种格式之间的相互转换
 */

import YAML from 'yaml';
import * as TOML from 'smol-toml';

/**
 * 数据格式类型
 */
export type DataFormat = 'json' | 'yaml' | 'toml';

/**
 * 转换选项
 */
export interface ConversionOptions {
  /** 缩进空格数 */
  indentSize?: 2 | 4;
}

/**
 * 解析错误信息
 */
export interface ParseError {
  message: string;
  line?: number;
  column?: number;
}

/**
 * 转换结果
 */
export interface ConversionResult {
  success: boolean;
  output: string;
  error?: ParseError;
}

/**
 * 格式检测结果
 */
export interface DetectionResult {
  format: DataFormat | null;
  confidence: 'high' | 'medium' | 'low';
}

/**
 * 解析 JSON 字符串
 */
export function parseJson(input: string): any {
  return JSON.parse(input);
}

/**
 * 解析 YAML 字符串
 */
export function parseYaml(input: string): any {
  return YAML.parse(input);
}


/**
 * 解析 TOML 字符串
 */
export function parseToml(input: string): any {
  return TOML.parse(input);
}

/**
 * 序列化为 JSON 字符串
 */
export function stringifyJson(data: any, indent: number = 2): string {
  return JSON.stringify(data, null, indent);
}

/**
 * 序列化为 YAML 字符串
 */
export function stringifyYaml(data: any, indent: number = 2): string {
  return YAML.stringify(data, { indent });
}

/**
 * 递归处理数据以兼容 TOML 格式
 * - 将 null 转换为空字符串
 * - 将 undefined 移除
 * - 处理顶层数组
 */
function prepareForToml(data: any): any {
  if (data === null || data === undefined) {
    return '';
  }
  
  if (Array.isArray(data)) {
    return data.map(item => prepareForToml(item));
  }
  
  if (typeof data === 'object' && data !== null) {
    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        result[key] = prepareForToml(value);
      }
    }
    return result;
  }
  
  return data;
}

/**
 * 序列化为 TOML 字符串
 */
export function stringifyToml(data: any): string {
  // 处理顶层数组
  let processedData = data;
  if (Array.isArray(data)) {
    processedData = { items: data };
  }
  
  // 处理 null 和 undefined
  processedData = prepareForToml(processedData);
  
  return TOML.stringify(processedData);
}

/**
 * 从错误中提取行号信息
 */
function extractLineInfo(error: Error, input: string): { line?: number; column?: number } {
  const message = error.message;
  
  // 尝试从错误消息中提取行号
  // JSON 错误格式: "... at position X"
  const posMatch = message.match(/at position (\d+)/i);
  if (posMatch) {
    const pos = parseInt(posMatch[1], 10);
    const lines = input.substring(0, pos).split('\n');
    return {
      line: lines.length,
      column: lines[lines.length - 1].length + 1,
    };
  }
  
  // YAML 错误格式: "at line X"
  const lineMatch = message.match(/at line (\d+)/i);
  if (lineMatch) {
    return { line: parseInt(lineMatch[1], 10) };
  }
  
  // TOML 错误格式: "line X"
  const tomlLineMatch = message.match(/line (\d+)/i);
  if (tomlLineMatch) {
    return { line: parseInt(tomlLineMatch[1], 10) };
  }
  
  return {};
}

/**
 * 主转换函数
 */
export function convert(
  input: string,
  sourceFormat: DataFormat,
  targetFormat: DataFormat,
  options: ConversionOptions = {}
): ConversionResult {
  const { indentSize = 2 } = options;
  
  if (!input.trim()) {
    return { success: true, output: '' };
  }
  
  try {
    // 解析输入
    let data: any;
    switch (sourceFormat) {
      case 'json':
        data = parseJson(input);
        break;
      case 'yaml':
        data = parseYaml(input);
        break;
      case 'toml':
        data = parseToml(input);
        break;
    }
    
    // 序列化输出
    let output: string;
    switch (targetFormat) {
      case 'json':
        output = stringifyJson(data, indentSize);
        break;
      case 'yaml':
        output = stringifyYaml(data, indentSize);
        break;
      case 'toml':
        output = stringifyToml(data);
        break;
    }
    
    return { success: true, output };
  } catch (e) {
    const error = e as Error;
    const lineInfo = extractLineInfo(error, input);
    
    return {
      success: false,
      output: '',
      error: {
        message: error.message,
        ...lineInfo,
      },
    };
  }
}

/**
 * 检测输入文本的格式
 */
export function detectFormat(input: string): DetectionResult {
  const trimmed = input.trim();
  
  if (!trimmed) {
    return { format: null, confidence: 'low' };
  }
  
  // TOML 检测: [section] 模式（优先检测，因为 JSON 也以 [ 开头）
  // TOML section 格式: [name] 后面跟换行，不是 JSON 数组
  const tomlSectionPattern = /^\s*\[[a-zA-Z_][a-zA-Z0-9_]*\]\s*$/m;
  const tomlKeyValuePattern = /^\s*[a-zA-Z_][a-zA-Z0-9_]*\s*=\s*.+$/m;
  
  // 检查是否是 TOML section 格式（以 [name] 开头，后面是换行或 key=value）
  if (tomlSectionPattern.test(trimmed)) {
    try {
      TOML.parse(trimmed);
      return { format: 'toml', confidence: 'high' };
    } catch {
      return { format: 'toml', confidence: 'medium' };
    }
  }
  
  // JSON 检测: 以 { 或 [ 开头（排除 TOML section）
  if (trimmed.startsWith('{') || (trimmed.startsWith('[') && !tomlSectionPattern.test(trimmed))) {
    try {
      JSON.parse(trimmed);
      return { format: 'json', confidence: 'high' };
    } catch {
      // 可能是格式错误的 JSON，仍然返回 JSON
      return { format: 'json', confidence: 'medium' };
    }
  }
  
  // TOML key = value 模式
  if (tomlKeyValuePattern.test(trimmed)) {
    // 排除 YAML 的可能性
    if (!trimmed.includes('---') && !trimmed.match(/^\s+-\s+/m)) {
      try {
        TOML.parse(trimmed);
        return { format: 'toml', confidence: 'high' };
      } catch {
        return { format: 'toml', confidence: 'medium' };
      }
    }
  }
  
  // YAML 检测: --- 分隔符或缩进键值对
  const yamlDocSeparator = /^---\s*$/m;
  const yamlKeyValuePattern = /^\s*[a-zA-Z_][a-zA-Z0-9_]*\s*:\s*.*/m;
  const yamlListPattern = /^\s*-\s+.+$/m;
  
  if (yamlDocSeparator.test(trimmed) || yamlKeyValuePattern.test(trimmed) || yamlListPattern.test(trimmed)) {
    try {
      YAML.parse(trimmed);
      return { format: 'yaml', confidence: 'medium' };
    } catch {
      return { format: 'yaml', confidence: 'low' };
    }
  }
  
  return { format: null, confidence: 'low' };
}

/**
 * 获取格式的显示名称
 */
export function getFormatDisplayName(format: DataFormat): string {
  const names: Record<DataFormat, string> = {
    json: 'JSON',
    yaml: 'YAML',
    toml: 'TOML',
  };
  return names[format];
}
