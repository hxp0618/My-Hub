import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useBatchMode } from '../useBatchMode';

describe('useBatchMode', () => {
  it('stores stable batch errors instead of raw converter messages', () => {
    const { result } = renderHook(() => useBatchMode({
      converter: () => {
        throw new Error('raw decoder detail for https://secret.example.com');
      },
      getErrorMessage: () => 'Safe batch conversion failed',
    }));

    act(() => {
      result.current.process('secret');
    });

    expect(result.current.results[0].error).toBe('Safe batch conversion failed');
    expect(result.current.results[0].error).not.toContain('secret.example.com');
  });

  it('falls back to a generic batch error when no mapper is provided', () => {
    const { result } = renderHook(() => useBatchMode({
      converter: () => {
        throw new Error('raw decoder detail');
      },
    }));

    act(() => {
      result.current.process('secret');
    });

    expect(result.current.results[0].error).toBe('Conversion failed');
  });
});
