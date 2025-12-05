import { useState, useCallback, useEffect, useRef, useMemo } from 'react';

/**
 * useRealTimeConvert Hook 配置选项
 */
export interface UseRealTimeConvertOptions {
  /** 防抖时间，默认 300ms */
  debounceMs?: number;
  /** 错误回调（手动转换时使用） */
  onError?: (error: Error) => void;
  /** 自动转换时是否静默错误，默认 true */
  silentError?: boolean;
  /** 初始输入值 */
  initialInput?: string;
}

/**
 * useRealTimeConvert Hook 返回值
 */
export interface UseRealTimeConvertReturn {
  /** 输入内容 */
  input: string;
  /** 输出内容 */
  output: string;
  /** 错误信息（仅手动转换时显示） */
  error: string | null;
  /** 设置输入内容 */
  setInput: (value: string) => void;
  /** 手动执行转换 */
  convert: () => void;
  /** 交换输入输出 */
  swap: () => void;
  /** 清空所有内容 */
  clear: () => void;
  /** 设置输出内容（用于外部控制） */
  setOutput: (value: string) => void;
  /** 清除错误 */
  clearError: () => void;
}

/**
 * 防抖函数
 */
function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): T & { cancel: () => void } {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  const debounced = function (this: unknown, ...args: Parameters<T>) {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  } as T & { cancel: () => void };

  debounced.cancel = () => {
    if (timeout) clearTimeout(timeout);
  };

  return debounced;
}

/**
 * 实时转换 Hook
 * 
 * 提供防抖自动转换、手动转换、输入输出交换等功能
 * 
 * @param converter 转换函数，接收输入字符串，返回输出字符串
 * @param options 配置选项
 * @returns Hook 返回值
 * 
 * @example
 * ```tsx
 * const { input, output, setInput, convert, swap, clear } = useRealTimeConvert(
 *   (text) => btoa(text),
 *   { debounceMs: 300 }
 * );
 * ```
 */
export function useRealTimeConvert(
  converter: (input: string) => string,
  options: UseRealTimeConvertOptions = {}
): UseRealTimeConvertReturn {
  const {
    debounceMs = 300,
    onError,
    silentError = true,
    initialInput = '',
  } = options;

  const [input, setInputState] = useState(initialInput);
  const [output, setOutput] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  // 保存 converter 的引用，避免在 useEffect 中重复创建防抖函数
  const converterRef = useRef(converter);
  converterRef.current = converter;

  // 执行转换的核心函数
  const executeConvert = useCallback((value: string, silent: boolean): string | null => {
    if (!value.trim()) {
      return '';
    }

    try {
      const result = converterRef.current(value);
      return result;
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      if (!silent) {
        setError(errorMessage);
        onError?.(e instanceof Error ? e : new Error(errorMessage));
      }
      return null;
    }
  }, [onError]);

  // 创建防抖的自动转换函数
  const debouncedAutoConvert = useMemo(
    () =>
      debounce((value: string) => {
        const result = executeConvert(value, silentError);
        if (result !== null) {
          setOutput(result);
          if (silentError) {
            setError(null);
          }
        }
      }, debounceMs),
    [debounceMs, executeConvert, silentError]
  );

  // 监听输入变化，触发自动转换
  useEffect(() => {
    debouncedAutoConvert(input);
    return () => debouncedAutoConvert.cancel();
  }, [input, debouncedAutoConvert]);

  // 设置输入内容
  const setInput = useCallback((value: string) => {
    setInputState(value);
    // 清除之前的错误（自动转换会静默处理）
    if (silentError) {
      setError(null);
    }
  }, [silentError]);

  // 手动执行转换（显示错误）
  const convert = useCallback(() => {
    // 取消待执行的防抖转换
    debouncedAutoConvert.cancel();
    
    const result = executeConvert(input, false);
    if (result !== null) {
      setOutput(result);
      setError(null);
    }
  }, [input, executeConvert, debouncedAutoConvert]);

  // 交换输入输出
  const swap = useCallback(() => {
    const currentInput = input;
    const currentOutput = output;
    
    setInputState(currentOutput);
    setOutput(currentInput);
    setError(null);
  }, [input, output]);

  // 清空所有内容
  const clear = useCallback(() => {
    debouncedAutoConvert.cancel();
    setInputState('');
    setOutput('');
    setError(null);
  }, [debouncedAutoConvert]);

  // 清除错误
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    input,
    output,
    error,
    setInput,
    convert,
    swap,
    clear,
    setOutput,
    clearError,
  };
}

export default useRealTimeConvert;
