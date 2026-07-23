import React from 'react';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ToolId } from '../../../../../types/tools';
import type { ToolInvocation } from '../../../../../types/toolInvocation';
import { Base64ConverterTool, decodeBase64, encodeBase64 } from '../Base64ConverterTool';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => ({
      'tools.base64Converter.encode': 'Encode',
      'tools.base64Converter.decode': 'Decode',
      'tools.base64Converter.inputText': 'Input Text',
      'tools.base64Converter.inputBase64': 'Input Base64',
      'tools.base64Converter.outputBase64': 'Base64 Output',
      'tools.base64Converter.outputText': 'Text Output',
      'tools.base64Converter.textPlaceholder': 'Enter text...',
      'tools.base64Converter.base64Placeholder': 'Enter Base64...',
      'tools.base64Converter.encodeError': 'Encode failed',
      'tools.base64Converter.decodeError': 'Decode failed',
      'tools.base64Converter.copy': 'Copy',
      'tools.base64Converter.clear': 'Clear',
      'tools.common.history': 'History',
      'tools.common.clearAll': 'Clear all',
      'tools.common.delete': 'Delete',
      'tools.common.error': 'Error',
      'tools.common.onePerLine': 'One per line',
      'tools.common.batchMode': 'Batch mode',
      'tools.common.batchPlaceholder': 'One item per line...',
      'tools.common.batchStats': `${options?.success ?? 0}/${options?.total ?? 0}`,
    }[key] ?? key),
  }),
}));

vi.mock('../../../../../hooks/useCopyToClipboard', () => ({
  useCopyToClipboard: () => ({
    copy: vi.fn(),
  }),
}));

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('Base64ConverterTool codec', () => {
  it('round-trips multilingual Unicode text', () => {
    const text = '中文、emoji 😀、accent é and symbols ✓';

    expect(decodeBase64(encodeBase64(text))).toBe(text);
  });

  it('matches standard UTF-8 base64 output', () => {
    expect(encodeBase64('hello')).toBe('aGVsbG8=');
    expect(encodeBase64('你好')).toBe('5L2g5aW9');
  });

  it('rejects malformed UTF-8 bytes instead of returning replacement text', () => {
    expect(() => decodeBase64('/w==')).toThrow();
  });

  it('prefills decode input from a matching tool invocation', async () => {
    const onInvocationHandled = vi.fn();
    const invocation: ToolInvocation = {
      id: 'base64-invocation',
      toolId: ToolId.BASE64_CONVERTER,
      input: '5L2g5aW9',
      mode: 'decode',
      source: 'smart-router',
    };

    render(
      <Base64ConverterTool
        isExpanded
        onToggleExpand={vi.fn()}
        invocation={invocation}
        onInvocationHandled={onInvocationHandled}
      />,
    );

    expect(screen.getByPlaceholderText('Enter Base64...')).toHaveValue('5L2g5aW9');
    await waitFor(() => {
      expect(screen.getByDisplayValue('你好')).toBeInTheDocument();
    });
    expect(onInvocationHandled).toHaveBeenCalledWith('base64-invocation');
  });

  it('restores the previous draft and mode when reopened', async () => {
    localStorage.setItem('tool_draft_base64-converter', JSON.stringify({
      input: '5L2g5aW9',
      output: '你好',
      mode: 'decode',
      updatedAt: 10,
    }));

    render(<Base64ConverterTool isExpanded onToggleExpand={vi.fn()} />);

    expect(screen.getByPlaceholderText('Enter Base64...')).toHaveValue('5L2g5aW9');
    await waitFor(() => expect(screen.getByDisplayValue('你好')).toBeInTheDocument());
  });
});
