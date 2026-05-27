import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { HTMLToMarkdownTool, htmlToMarkdown } from '../HTMLToMarkdownTool';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => ({
      'tools.htmlToMarkdown.mode': 'Input Mode',
      'tools.htmlToMarkdown.modeHtml': 'HTML Code',
      'tools.htmlToMarkdown.modeUrl': 'Web URL',
      'tools.htmlToMarkdown.cleanHtml': 'Smart extract content',
      'tools.htmlToMarkdown.copy': 'Copy',
      'tools.htmlToMarkdown.clear': 'Clear',
      'tools.htmlToMarkdown.urlPlaceholder': 'Enter web page URL...',
      'tools.htmlToMarkdown.fetch': 'Fetch',
      'tools.htmlToMarkdown.input': 'HTML Input',
      'tools.htmlToMarkdown.inputPlaceholder': 'Paste HTML code...',
      'tools.htmlToMarkdown.output': 'Markdown Output',
      'tools.htmlToMarkdown.outputPlaceholder': 'Converted Markdown will appear here...',
      'tools.htmlToMarkdown.emptyUrl': 'Please enter a URL',
      'tools.htmlToMarkdown.invalidUrl': 'Invalid URL format',
      'tools.htmlToMarkdown.fetchError': 'Fetch failed',
      'tools.htmlToMarkdown.convertError': 'Conversion failed',
    }[key] ?? key),
  }),
}));

vi.mock('../../../../../hooks/useCopyToClipboard', () => ({
  useCopyToClipboard: () => ({
    copy: vi.fn(),
  }),
}));

describe('HTMLToMarkdownTool', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('extracts article content when converting HTML', () => {
    const result = htmlToMarkdown('<main><h1>Title</h1><p>Hello <strong>Hub</strong></p></main><aside>Skip</aside>');

    expect(result).toBe('# Title\n\nHello **Hub**');
  });

  it('shows a localized fetch error without raw network details', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: vi.fn(),
    }));

    render(<HTMLToMarkdownTool isExpanded onToggleExpand={vi.fn()} />);

    fireEvent.change(screen.getByRole('combobox'), {
      target: { value: 'url' },
    });
    fireEvent.change(screen.getByPlaceholderText('Enter web page URL...'), {
      target: { value: 'https://example.com/page' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Fetch' }));

    await waitFor(() => {
      expect(screen.getByText('Fetch failed')).toBeInTheDocument();
    });
    expect(screen.queryByText(/HTTP 500/)).not.toBeInTheDocument();
  });
});
