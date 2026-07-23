import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ToolId } from '../../../../../types/tools';
import { SmartToolRouter } from '../SmartToolRouter';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => ({
      'tools.smartToolRouter.inputLabel': 'Input',
      'tools.smartToolRouter.inputPlaceholder': 'Paste developer text...',
      'tools.smartToolRouter.recommendations': 'Recommendations',
      'tools.smartToolRouter.preview': 'Preview',
      'tools.smartToolRouter.previewNextSteps': 'Next steps',
      'tools.smartToolRouter.openTool': 'Open tool',
      'tools.smartToolRouter.copyPreview': 'Copy preview',
      'tools.smartToolRouter.openPreviewWithTool': `Use preview with ${options?.name}`,
      'tools.smartToolRouter.emptyInput': 'Paste text to see suggestions',
      'tools.smartToolRouter.noSuggestions': 'No matching tools found',
      'tools.smartToolRouter.intents.jsonFormat.title': 'Format JSON',
      'tools.smartToolRouter.intents.jsonFormat.description': 'Format strict JSON with indentation.',
      'tools.smartToolRouter.intents.base64Decode.title': 'Decode Base64',
      'tools.smartToolRouter.intents.base64Decode.description': 'Decode UTF-8 Base64 text.',
      'tools.smartToolRouter.intentConfidence': 'Confidence 98%',
      'tools.copySuccess': 'Copied',
      'tools.copyError': 'Copy failed',
      'tools.copyEmpty': 'Nothing to copy',
    }[key] ?? key),
  }),
}));

const copyMock = vi.fn();
vi.mock('../../../../../hooks/useCopyToClipboard', () => ({
  useCopyToClipboard: () => ({
    copy: copyMock,
  }),
}));

describe('SmartToolRouter', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('recommends a tool, previews the local result, and opens the target tool with input', async () => {
    const onOpenTool = vi.fn();

    render(
      <SmartToolRouter
        isExpanded
        onToggleExpand={vi.fn()}
        onOpenTool={onOpenTool}
      />,
    );

    fireEvent.change(screen.getByPlaceholderText('Paste developer text...'), {
      target: { value: '{"name":"My Hub"}' },
    });

    expect(screen.getByRole('button', { name: /Format JSON/ })).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText(/"name": "My Hub"/)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Open tool' }));

    expect(onOpenTool).toHaveBeenCalledWith(
      ToolId.JSON_FORMATTER,
      expect.objectContaining({
        toolId: ToolId.JSON_FORMATTER,
        input: '{"name":"My Hub"}',
        mode: 'format',
        source: 'smart-router',
      }),
    );
  });

  it('offers a next step when the preview output matches another tool', async () => {
    const onOpenTool = vi.fn();

    render(
      <SmartToolRouter
        isExpanded
        onToggleExpand={vi.fn()}
        onOpenTool={onOpenTool}
      />,
    );

    fireEvent.change(screen.getByPlaceholderText('Paste developer text...'), {
      target: { value: 'eyJuYW1lIjoiTXkgSHViIn0=' },
    });

    expect(screen.getByRole('button', { name: /Decode Base64/ })).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText('{"name":"My Hub"}')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Use preview with Format JSON' }));

    expect(onOpenTool).toHaveBeenCalledWith(
      ToolId.JSON_FORMATTER,
      expect.objectContaining({
        toolId: ToolId.JSON_FORMATTER,
        input: '{"name":"My Hub"}',
        mode: 'format',
        source: 'smart-router',
      }),
    );
  });
});
