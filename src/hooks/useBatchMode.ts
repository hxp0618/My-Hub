import { useState, useCallback, useMemo } from 'react';

/**
 * 批量转换结果项
 */
export interface BatchResult {
  /** 行号（从 1 开始） */
  line: number;
  /** 输入内容 */
  input: string;
  /** 输出内容（成功时） */
  output: string | null;
  /** 错误信息（失败时） */
  error: string | null;
  /** 是否成功 */
  success: boolean;
}

/**
 * useBatchMode Hook 配置选项
 */
export interface UseBatchModeOptions {
  /** 转换函数 */
  converter: (input: string) => string;
  /** 分隔符，默认换行符 */
  separator?: string;
}

/**
 * useBatchMode Hook 返回值
 */
export interface UseBatchModeReturn {
  /** 是否启用批量模式 */
  enabled: boolean;
  /** 设置批量模式状态 */
  setEnabled: (value: boolean) => void;
  /** 批量转换结果 */
  results: BatchResult[];
  /** 执行批量转换 */
  process: (input: string) => void;
  /** 获取所有成功转换的结果（每行一个） */
  getSuccessfulResults: () => string;
  /** 清空结果 */
  clearResults: () => void;
  /** 成功数量 */
  successCount: number;
  /** 失败数量 */
  failureCount: number;
}

/**
 * 批量处理模式 Hook
 * 
 * 提供多行内容独立转换、错误隔离、结果提取等功能
 * 
 * @param options 配置选项
 * @returns Hook 返回值
 * 
 * @example
 * ```tsx
 * const { enabled, setEnabled, results, process, getSuccessfulResults } = useBatchMode({
 *   converter: (text) => btoa(text),
 * });
 * ```
 */
export function useBatchMode(options: UseBatchModeOptions): UseBatchModeReturn {
  const { converter, separator = '\n' } = options;

  const [enabled, setEnabled] = useState(false);
  const [results, setResults] = useState<BatchResult[]>([]);

  // 执行批量转换
  const process = useCallback((input: string) => {
    if (!input) {
      setResults([]);
      return;
    }

    const lines = input.split(separator);
    const newResults: BatchResult[] = lines.map((line, index) => {
      const trimmedLine = line.trim();
      
      // 空行处理
      if (!trimmedLine) {
        return {
          line: index + 1,
          input: line,
          output: '',
          error: null,
          success: true,
        };
      }

      try {
        const output = converter(trimmedLine);
        return {
          line: index + 1,
          input: line,
          output,
          error: null,
          success: true,
        };
      } catch (e) {
        const errorMessage = e instanceof Error ? e.message : String(e);
        return {
          line: index + 1,
          input: line,
          output: null,
          error: errorMessage,
          success: false,
        };
      }
    });

    setResults(newResults);
  }, [converter, separator]);

  // 获取所有成功转换的结果（排除失败行，保留空行的空输出）
  const getSuccessfulResults = useCallback((): string => {
    return results
      .map(r => r.success ? (r.output ?? '') : null)
      .filter((output): output is string => output !== null)
      .join(separator);
  }, [results, separator]);

  // 清空结果
  const clearResults = useCallback(() => {
    setResults([]);
  }, []);

  // 计算成功和失败数量
  const { successCount, failureCount } = useMemo(() => {
    let success = 0;
    let failure = 0;
    
    for (const result of results) {
      // 不计算空行
      if (result.input.trim()) {
        if (result.success) {
          success++;
        } else {
          failure++;
        }
      }
    }
    
    return { successCount: success, failureCount: failure };
  }, [results]);

  return {
    enabled,
    setEnabled,
    results,
    process,
    getSuccessfulResults,
    clearResults,
    successCount,
    failureCount,
  };
}

export default useBatchMode;
