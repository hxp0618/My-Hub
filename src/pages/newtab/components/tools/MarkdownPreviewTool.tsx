import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ToolCard } from '../../../../components/ToolCard';
import { TOOL_METADATA, ToolId, ToolComponentProps } from '../../../../types/tools';
import { useCopyToClipboard } from '../../../../hooks/useCopyToClipboard';

export type ViewMode = 'edit' | 'preview' | 'split';

const SAFE_MARKDOWN_URL_PROTOCOLS = new Set(['http:', 'https:', 'mailto:', 'tel:']);

const escapeHtml = (value: string): string => (
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
);

const escapeHtmlAttribute = (value: string): string => (
  escapeHtml(value).replace(/"/g, '&quot;').replace(/'/g, '&#39;')
);

export const sanitizeMarkdownUrl = (url: string): string => {
  const trimmedUrl = url.trim();
  const normalizedUrl = Array.from(trimmedUrl)
    .filter(char => {
      const codePoint = char.codePointAt(0) ?? 0;
      return codePoint > 31 && codePoint !== 127 && !/\s/.test(char);
    })
    .join('')
    .toLowerCase();

  if (!trimmedUrl) return '#';
  if (/["'<>`]/.test(trimmedUrl)) return '#';
  if (
    trimmedUrl.startsWith('#') ||
    trimmedUrl.startsWith('/') ||
    trimmedUrl.startsWith('./') ||
    trimmedUrl.startsWith('../')
  ) {
    return trimmedUrl;
  }

  // Block obfuscated javascript/data URLs before URL parsing normalizes them.
  if (normalizedUrl.startsWith('javascript:') || normalizedUrl.startsWith('data:') || normalizedUrl.startsWith('vbscript:')) {
    return '#';
  }

  try {
    const parsedUrl = new URL(trimmedUrl, 'https://my-hub.local');
    if (SAFE_MARKDOWN_URL_PROTOCOLS.has(parsedUrl.protocol)) {
      return trimmedUrl;
    }
  } catch {
    return '#';
  }

  return '#';
};

/**
 * 简单的 Markdown 转 HTML（不依赖外部库）
 */
export const markdownToHtml = (markdown: string): string => {
  let html = markdown
    // 转义 HTML
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    // 标题
    .replace(/^### (.*$)/gm, '<h3>$1</h3>')
    .replace(/^## (.*$)/gm, '<h2>$1</h2>')
    .replace(/^# (.*$)/gm, '<h1>$1</h1>')
    // 粗体和斜体
    .replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    // 代码块
    .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code class="language-$1">$2</code></pre>')
    // 行内代码
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // 图片
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_match, alt: string, url: string) => {
      const safeUrl = sanitizeMarkdownUrl(url);
      return `<img src="${escapeHtmlAttribute(safeUrl)}" alt="${escapeHtmlAttribute(alt)}" />`;
    })
    // 链接
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_match, label: string, url: string) => {
      const safeUrl = sanitizeMarkdownUrl(url);
      return `<a href="${escapeHtmlAttribute(safeUrl)}" target="_blank" rel="noopener noreferrer">${label}</a>`;
    })
    // 无序列表
    .replace(/^\s*[-*+] (.*$)/gm, '<li>$1</li>')
    // 有序列表
    .replace(/^\s*\d+\. (.*$)/gm, '<li>$1</li>')
    // 引用
    .replace(/^> (.*$)/gm, '<blockquote>$1</blockquote>')
    // 水平线
    .replace(/^---$/gm, '<hr />')
    // 段落
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br />');

  // 包装列表项
  html = html.replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>');
  // 合并连续的 blockquote
  html = html.replace(/<\/blockquote>\s*<blockquote>/g, '<br />');

  return `<p>${html}</p>`;
};

export const MarkdownPreviewTool: React.FC<ToolComponentProps> = ({ isExpanded, onToggleExpand }) => {
  const { t } = useTranslation();
  const { copy } = useCopyToClipboard();
  const [markdown, setMarkdown] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('split');

  const html = useMemo(() => markdownToHtml(markdown), [markdown]);

  return (
    <ToolCard tool={TOOL_METADATA[ToolId.MARKDOWN_PREVIEW]} isExpanded={isExpanded} onToggleExpand={onToggleExpand}>
      <div className="h-full flex flex-col gap-4">
        <div className="flex items-center gap-4 flex-shrink-0">
          <div className="flex items-center gap-2">
            <label className="text-sm nb-text-secondary">{t('tools.markdownPreview.viewMode')}:</label>
            <select value={viewMode} onChange={e => setViewMode(e.target.value as ViewMode)}
              className="nb-input text-sm">
              <option value="edit">{t('tools.markdownPreview.edit')}</option>
              <option value="preview">{t('tools.markdownPreview.preview')}</option>
              <option value="split">{t('tools.markdownPreview.split')}</option>
            </select>
          </div>
          <button onClick={() => copy(html)} disabled={!html}
            className="nb-btn nb-btn-secondary text-sm">
            {t('tools.markdownPreview.copyHtml')}
          </button>
        </div>

        <div className={`flex-1 min-h-0 ${viewMode === 'split' ? 'grid grid-cols-2 gap-4' : ''}`}>
          {(viewMode === 'edit' || viewMode === 'split') && (
            <div className="flex flex-col min-h-0">
              <label className="block text-sm font-medium nb-text mb-2 flex-shrink-0">
                {t('tools.markdownPreview.input')}
              </label>
              <textarea
                value={markdown}
                onChange={e => setMarkdown(e.target.value)}
                placeholder={t('tools.markdownPreview.inputPlaceholder')}
                className="nb-input flex-1 font-mono text-sm resize-none"
              />
            </div>
          )}
          {(viewMode === 'preview' || viewMode === 'split') && (
            <div className="flex flex-col min-h-0">
              <label className="block text-sm font-medium nb-text mb-2 flex-shrink-0">
                {t('tools.markdownPreview.preview')}
              </label>
              <div
                className="flex-1 p-3 nb-card-static overflow-auto prose prose-sm dark:prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: html || `<p class="nb-text-secondary">${t('tools.markdownPreview.emptyPreview')}</p>` }}
              />
            </div>
          )}
        </div>
      </div>
    </ToolCard>
  );
};
