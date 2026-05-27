import { describe, expect, it } from 'vitest';
import { markdownToHtml, sanitizeMarkdownUrl } from '../MarkdownPreviewTool';

describe('MarkdownPreviewTool', () => {
  it('keeps regular links and images renderable', () => {
    const html = markdownToHtml('[Open](https://example.com)\n\n![Logo](/logo.png)');

    expect(html).toContain('href="https://example.com"');
    expect(html).toContain('src="/logo.png"');
    expect(html).toContain('alt="Logo"');
  });

  it('blocks unsafe link and image protocols', () => {
    const html = markdownToHtml('[Bad](javascript:alert(1))\n\n![Bad](data:text/html;base64,PHNjcmlwdA==)');

    expect(html).not.toContain('javascript:');
    expect(html).not.toContain('data:text/html');
    expect(html).toContain('href="#"');
    expect(html).toContain('src="#"');
  });

  it('escapes attribute-breaking quotes in link and image values', () => {
    const html = markdownToHtml('[Bad](" onmouseover="alert(1))\n\n![bad" alt](/x" onerror="alert(1))');

    expect(html).not.toContain('onmouseover=');
    expect(html).not.toContain('onerror=');
    expect(html).toContain('alt="bad&quot; alt"');
  });

  it('allows safe relative and contact URLs', () => {
    expect(sanitizeMarkdownUrl('#section')).toBe('#section');
    expect(sanitizeMarkdownUrl('../docs/readme.md')).toBe('../docs/readme.md');
    expect(sanitizeMarkdownUrl('mailto:hello@example.com')).toBe('mailto:hello@example.com');
  });
});
