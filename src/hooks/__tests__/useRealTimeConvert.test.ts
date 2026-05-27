import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useRealTimeConvert } from '../useRealTimeConvert';

describe('useRealTimeConvert', () => {
  it('uses a stable display error instead of raw converter errors', () => {
    const onError = vi.fn();
    const { result } = renderHook(() => useRealTimeConvert(
      () => {
        throw new Error('raw parser detail at https://secret.example.com');
      },
      {
        debounceMs: 10,
        getErrorMessage: () => 'Safe conversion failed',
        onError,
        silentError: true,
      }
    ));

    act(() => {
      result.current.setInput('secret');
    });
    act(() => {
      result.current.convert();
    });

    expect(result.current.error).toBe('Safe conversion failed');
    expect(result.current.error).not.toContain('secret.example.com');
    expect(onError).toHaveBeenCalledWith(expect.any(Error));
  });

  it('falls back to a generic display error when no mapper is provided', () => {
    const { result } = renderHook(() => useRealTimeConvert(
      () => {
        throw new Error('raw parser detail');
      },
      { debounceMs: 10 }
    ));

    act(() => {
      result.current.setInput('secret');
    });
    act(() => {
      result.current.convert();
    });

    expect(result.current.error).toBe('Conversion failed');
  });
});
