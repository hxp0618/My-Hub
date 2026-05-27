import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { JSONFormatterTool } from '../JSONFormatterTool';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => ({
      'tools.jsonFormatter.input': 'Input JSON',
      'tools.jsonFormatter.inputPlaceholder': 'Paste or type JSON data...',
      'tools.jsonFormatter.output': 'Formatted Result',
      'tools.jsonFormatter.outputPlaceholder': 'Formatted JSON will appear here...',
      'tools.jsonFormatter.format': 'Format',
      'tools.jsonFormatter.compress': 'Compress',
      'tools.jsonFormatter.copy': 'Copy',
      'tools.jsonFormatter.clear': 'Clear',
      'tools.jsonFormatter.error': 'JSON Syntax Error',
      'tools.jsonFormatter.emptyInput': 'Please enter JSON data',
      'tools.jsonFormatter.escapeMode': 'Escape Characters',
      'tools.jsonFormatter.preserve': 'Preserve',
      'tools.jsonFormatter.remove': 'Remove',
    }[key] ?? key),
  }),
}));

vi.mock('../../../../../hooks/useCopyToClipboard', () => ({
  useCopyToClipboard: () => ({
    copy: vi.fn(),
  }),
}));

describe('JSONFormatterTool', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('auto-formats valid JSON after the debounce delay', async () => {
    render(<JSONFormatterTool isExpanded onToggleExpand={vi.fn()} />);

    fireEvent.change(screen.getByPlaceholderText('Paste or type JSON data...'), {
      target: { value: '{"name":"My Hub","enabled":true}' },
    });

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Formatted JSON will appear here...')).toHaveValue(
        '{\n  "name": "My Hub",\n  "enabled": true\n}',
      );
    });
  });

  it('clears stale auto-formatted output when input becomes invalid', async () => {
    render(<JSONFormatterTool isExpanded onToggleExpand={vi.fn()} />);

    const input = screen.getByPlaceholderText('Paste or type JSON data...');
    const output = screen.getByPlaceholderText('Formatted JSON will appear here...');

    fireEvent.change(input, {
      target: { value: '{"name":"My Hub"}' },
    });

    await waitFor(() => {
      expect(output).toHaveValue('{\n  "name": "My Hub"\n}');
    });

    fireEvent.change(input, {
      target: { value: '{"name":' },
    });

    await waitFor(() => {
      expect(output).toHaveValue('');
    });
    expect(screen.queryByText('JSON Syntax Error')).not.toBeInTheDocument();
  });

  it('compresses formatted JSON on demand', () => {
    render(<JSONFormatterTool isExpanded onToggleExpand={vi.fn()} />);

    fireEvent.change(screen.getByPlaceholderText('Paste or type JSON data...'), {
      target: { value: '{\n  "name": "My Hub"\n}' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Compress' }));

    expect(screen.getByPlaceholderText('Formatted JSON will appear here...')).toHaveValue('{"name":"My Hub"}');
  });

  it('shows a localized syntax error without raw parser details', () => {
    render(<JSONFormatterTool isExpanded onToggleExpand={vi.fn()} />);

    fireEvent.change(screen.getByPlaceholderText('Paste or type JSON data...'), {
      target: { value: '{"name":' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Format' }));

    expect(screen.getByText('JSON Syntax Error')).toBeInTheDocument();
    expect(screen.queryByText(/Unexpected|unterminated|position/i)).not.toBeInTheDocument();
  });
});
