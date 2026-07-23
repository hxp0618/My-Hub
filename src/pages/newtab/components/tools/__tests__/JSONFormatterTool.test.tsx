import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ToolId } from '../../../../../types/tools';
import type { ToolInvocation } from '../../../../../types/toolInvocation';
import { JSONFormatterTool, queryJsonPath, repairJsonInput } from '../JSONFormatterTool';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => ({
      'tools.jsonFormatter.input': 'Input JSON',
      'tools.jsonFormatter.inputPlaceholder': 'Paste or type JSON data...',
      'tools.jsonFormatter.output': 'Formatted Result',
      'tools.jsonFormatter.outputPlaceholder': 'Formatted JSON will appear here...',
      'tools.jsonFormatter.format': 'Format',
      'tools.jsonFormatter.compress': 'Compress',
      'tools.jsonFormatter.repair': 'Repair',
      'tools.jsonFormatter.queryLabel': 'Query Path',
      'tools.jsonFormatter.queryPlaceholder': '$.items[0].name',
      'tools.jsonFormatter.query': 'Query',
      'tools.jsonFormatter.queryResult': 'Query Result',
      'tools.jsonFormatter.queryEmpty': 'Enter a JSON path',
      'tools.jsonFormatter.queryInvalidPath': 'Invalid JSON path',
      'tools.jsonFormatter.queryNotFound': 'Path not found',
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
    localStorage.clear();
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

  it('repairs relaxed JSON into strict formatted JSON', () => {
    const repaired = repairJsonInput("{name:'My Hub', enabled:true,}");

    expect(JSON.parse(repaired)).toEqual({ name: 'My Hub', enabled: true });
    expect(repaired).toBe('{\n  "name": "My Hub",\n  "enabled": true\n}');
  });

  it('queries simple object and array JSON paths', () => {
    const source = '{"user":{"name":"Ada"},"items":[{"id":1}]}';

    expect(queryJsonPath(source, '$.user.name')).toEqual({
      success: true,
      output: '"Ada"',
    });
    expect(queryJsonPath(source, '$.items[0].id')).toEqual({
      success: true,
      output: '1',
    });
  });

  it('reports missing JSON query paths without throwing parser details', () => {
    expect(queryJsonPath('{"user":{"name":"Ada"}}', '$.user.email')).toEqual({
      success: false,
      error: 'notFound',
    });
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

  it('prefills input from a matching tool invocation and marks it handled once', async () => {
    const onInvocationHandled = vi.fn();
    const invocation: ToolInvocation = {
      id: 'json-invocation',
      toolId: ToolId.JSON_FORMATTER,
      input: '{"name":"My Hub"}',
      mode: 'format',
      source: 'home-search',
    };

    const { rerender } = render(
      <JSONFormatterTool
        isExpanded
        onToggleExpand={vi.fn()}
        invocation={invocation}
        onInvocationHandled={onInvocationHandled}
      />,
    );

    expect(screen.getByPlaceholderText('Paste or type JSON data...')).toHaveValue('{"name":"My Hub"}');
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Formatted JSON will appear here...')).toHaveValue(
        '{\n  "name": "My Hub"\n}',
      );
    });
    expect(onInvocationHandled).toHaveBeenCalledTimes(1);
    expect(onInvocationHandled).toHaveBeenCalledWith('json-invocation');

    rerender(
      <JSONFormatterTool
        isExpanded
        onToggleExpand={vi.fn()}
        invocation={invocation}
        onInvocationHandled={onInvocationHandled}
      />,
    );

    expect(onInvocationHandled).toHaveBeenCalledTimes(1);
  });
});
