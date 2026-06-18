import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  buildHtmlPreviewSrcDoc,
  getHtmlPreviewSandbox,
  HTMLPreviewTool,
} from '../HTMLPreviewTool';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => ({
      'tools.htmlPreview.viewMode': 'View Mode',
      'tools.htmlPreview.edit': 'Edit',
      'tools.htmlPreview.preview': 'Preview',
      'tools.htmlPreview.split': 'Split',
      'tools.htmlPreview.allowScripts': 'Allow scripts',
      'tools.htmlPreview.openPreview': 'Open Preview',
      'tools.htmlPreview.copy': 'Copy HTML',
      'tools.htmlPreview.clear': 'Clear',
      'tools.htmlPreview.input': 'HTML Input',
      'tools.htmlPreview.inputPlaceholder': 'Paste HTML code...',
      'tools.htmlPreview.previewTitle': 'HTML Preview',
      'tools.htmlPreview.emptyPreview': 'Preview will appear here',
      'tools.htmlPreview.frameTitle': 'HTML preview frame',
    }[key] ?? key),
  }),
}));

vi.mock('../../../../../hooks/useCopyToClipboard', () => ({
  useCopyToClipboard: () => ({
    copy: vi.fn(),
  }),
}));

describe('HTMLPreviewTool', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('uses pasted HTML as iframe srcDoc for live preview', () => {
    render(<HTMLPreviewTool isExpanded onToggleExpand={vi.fn()} />);

    fireEvent.change(screen.getByPlaceholderText('Paste HTML code...'), {
      target: { value: '<h1>Hello Hub</h1><p>Preview</p>' },
    });

    const frame = screen.getByTitle('HTML preview frame');
    expect(frame).toHaveAttribute('srcdoc', '<h1>Hello Hub</h1><p>Preview</p>');
    expect(frame).toHaveAttribute('sandbox', getHtmlPreviewSandbox(false));
  });

  it('keeps scripts disabled until the user explicitly allows them', () => {
    render(<HTMLPreviewTool isExpanded onToggleExpand={vi.fn()} />);

    const frame = screen.getByTitle('HTML preview frame');
    expect(frame.getAttribute('sandbox')).not.toContain('allow-scripts');

    fireEvent.click(screen.getByLabelText('Allow scripts'));

    expect(frame).toHaveAttribute('sandbox', getHtmlPreviewSandbox(true));
  });

  it('opens the current HTML in a blob preview window', () => {
    vi.useFakeTimers();
    const createObjectURL = vi.fn(() => 'blob:html-preview');
    const revokeObjectURL = vi.fn();
    const open = vi.fn();
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL });
    vi.stubGlobal('open', open);

    render(<HTMLPreviewTool isExpanded onToggleExpand={vi.fn()} />);

    fireEvent.change(screen.getByPlaceholderText('Paste HTML code...'), {
      target: { value: '<main>Standalone preview</main>' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Open Preview' }));

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(open).toHaveBeenCalledWith('blob:html-preview', '_blank', 'noopener,noreferrer');

    vi.runAllTimers();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:html-preview');
  });

  it('builds an empty preview document when no HTML is provided', () => {
    expect(buildHtmlPreviewSrcDoc('', 'Empty')).toContain('Empty');
  });
});
