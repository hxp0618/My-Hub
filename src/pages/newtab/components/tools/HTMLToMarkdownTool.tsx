import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ToolCard } from '../../../../components/ToolCard';
import { TOOL_METADATA, ToolId, ToolComponentProps } from '../../../../types/tools';
import { useCopyToClipboard } from '../../../../hooks/useCopyToClipboard';
import TurndownService from 'turndown';

/**
 * 创建优化的 Turndown 实例
 */
const createTurndownService = (): TurndownService => {
  const service = new TurndownService({
    headingStyle: 'atx',
    hr: '---',
    bulletListMarker: '-',
    codeBlockStyle: 'fenced',
    fence: '```',
    emDelimiter: '*',
    strongDelimiter: '**',
    linkStyle: 'inlined',
    linkReferenceStyle: 'full',
  });

  // 保留换行
  service.keep(['br']);

  // 移除脚本和样式标签
  service.remove(['script', 'style', 'noscript', 'iframe']);

  // 自定义图片规则
  service.addRule('images', {
    filter: 'img',
    replacement: (_content, node) => {
      const img = node as HTMLImageElement;
      const alt = img.alt || '';
      const src = img.src || img.getAttribute('data-src') || '';
      const title = img.title ? ` "${img.title}"` : '';
      if (!src) return '';
      return `![${alt}](${src}${title})`;
    },
  });

  // 自定义链接规则
  service.addRule('links', {
    filter: node => node.nodeName === 'A' && !!(node as HTMLAnchorElement).href,
    replacement: (content, node) => {
      const anchor = node as HTMLAnchorElement;
      const href = anchor.href;
      const title = anchor.title ? ` "${anchor.title}"` : '';
      const text = content.trim() || href;
      if (text === href) return `<${href}>`;
      return `[${text}](${href}${title})`;
    },
  });

  // 处理代码块
  service.addRule('codeBlocks', {
    filter: node => node.nodeName === 'PRE' && node.firstChild?.nodeName === 'CODE',
    replacement: (_content, node) => {
      const code = node.firstChild as HTMLElement;
      const className = code.className || '';
      const langMatch = className.match(/language-(\w+)/);
      const lang = langMatch ? langMatch[1] : '';
      const text = code.textContent || '';
      return `\n\`\`\`${lang}\n${text}\n\`\`\`\n`;
    },
  });

  return service;
};

/**
 * HTML 转 Markdown
 */
export const htmlToMarkdown = (html: string, cleanHtml: boolean = true): string => {
  if (!html.trim()) return '';

  try {
    let processedHtml = html;

    if (cleanHtml) {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const mainContent = doc.querySelector('article, main, .content, .post, #content, #main');
      processedHtml = mainContent ? mainContent.innerHTML : doc.body.innerHTML;
    }

    const service = createTurndownService();
    let markdown = service.turndown(processedHtml);
    markdown = markdown.replace(/\n{3,}/g, '\n\n').trim();
    return markdown;
  } catch {
    return '';
  }
};

type InputMode = 'html' | 'url';

export const HTMLToMarkdownTool: React.FC<ToolComponentProps> = ({ isExpanded, onToggleExpand }) => {
  const { t } = useTranslation();
  const { copy } = useCopyToClipboard();
  const [inputMode, setInputMode] = useState<InputMode>('html');
  const [html, setHtml] = useState('');
  const [url, setUrl] = useState('');
  const [markdown, setMarkdown] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [cleanHtml, setCleanHtml] = useState(true);

  useEffect(() => {
    if (inputMode !== 'html') return;
    if (!html.trim()) {
      setMarkdown('');
      setError(null);
      return;
    }
    try {
      setMarkdown(htmlToMarkdown(html, cleanHtml));
      setError(null);
    } catch (e) {
      setError((e as Error).message);
      setMarkdown('');
    }
  }, [html, inputMode, cleanHtml]);

  const handleFetchUrl = async () => {
    if (!url.trim()) {
      setError(t('tools.htmlToMarkdown.emptyUrl'));
      return;
    }
    try {
      new URL(url);
    } catch {
      setError(t('tools.htmlToMarkdown.invalidUrl'));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const fetchedHtml = await res.text();
      setHtml(fetchedHtml);
      setMarkdown(htmlToMarkdown(fetchedHtml, cleanHtml));
    } catch (e) {
      setError(t('tools.htmlToMarkdown.fetchError') + ': ' + (e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setHtml('');
    setUrl('');
    setMarkdown('');
    setError(null);
  };

  return (
    <ToolCard tool={TOOL_METADATA[ToolId.HTML_TO_MARKDOWN]} isExpanded={isExpanded} onToggleExpand={onToggleExpand}>
      <div className="h-full flex flex-col gap-4">
        <div className="flex items-center gap-4 flex-wrap flex-shrink-0">
          <div className="flex items-center gap-2">
            <label className="text-sm nb-text-secondary">{t('tools.htmlToMarkdown.mode')}:</label>
            <select
              value={inputMode}
              onChange={e => setInputMode(e.target.value as InputMode)}
              className="nb-input text-sm"
            >
              <option value="html">{t('tools.htmlToMarkdown.modeHtml')}</option>
              <option value="url">{t('tools.htmlToMarkdown.modeUrl')}</option>
            </select>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={cleanHtml}
              onChange={e => setCleanHtml(e.target.checked)}
              className="w-4 h-4 rounded nb-border accent-[var(--nb-accent-yellow)]"
            />
            <span className="text-sm nb-text-secondary">{t('tools.htmlToMarkdown.cleanHtml')}</span>
          </label>
          <div className="flex gap-2 ml-auto">
            <button
              onClick={() => copy(markdown)}
              disabled={!markdown}
              className="nb-btn nb-btn-primary text-sm"
            >
              {t('tools.htmlToMarkdown.copy')}
            </button>
            <button onClick={handleClear} className="nb-btn nb-btn-ghost text-sm">
              {t('tools.htmlToMarkdown.clear')}
            </button>
          </div>
        </div>

        {inputMode === 'url' && (
          <div className="flex gap-2 flex-shrink-0">
            <input
              type="url"
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder={t('tools.htmlToMarkdown.urlPlaceholder')}
              className="nb-input flex-1 text-sm"
              onKeyDown={e => e.key === 'Enter' && handleFetchUrl()}
            />
            <button
              onClick={handleFetchUrl}
              disabled={loading || !url.trim()}
              className="nb-btn nb-btn-primary text-sm flex items-center gap-2"
            >
              {loading && <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>}
              {t('tools.htmlToMarkdown.fetch')}
            </button>
          </div>
        )}

        {error && (
          <div className="p-3 nb-bg-card nb-border rounded-lg flex-shrink-0" style={{ borderColor: 'var(--nb-accent-pink)' }}>
            <p className="text-sm" style={{ color: 'var(--nb-accent-pink)' }}>{error}</p>
          </div>
        )}

        <div className="flex-1 grid grid-cols-2 gap-4 min-h-0">
          <div className="flex flex-col min-h-0">
            <label className="block text-sm font-medium nb-text mb-2 flex-shrink-0">{t('tools.htmlToMarkdown.input')}</label>
            <textarea
              value={html}
              onChange={e => setHtml(e.target.value)}
              placeholder={t('tools.htmlToMarkdown.inputPlaceholder')}
              readOnly={inputMode === 'url' && loading}
              className="nb-input flex-1 font-mono text-sm resize-none"
            />
          </div>
          <div className="flex flex-col min-h-0">
            <label className="block text-sm font-medium nb-text mb-2 flex-shrink-0">{t('tools.htmlToMarkdown.output')}</label>
            <textarea
              value={markdown}
              readOnly
              placeholder={t('tools.htmlToMarkdown.outputPlaceholder')}
              className="nb-input flex-1 font-mono text-sm resize-none nb-bg"
            />
          </div>
        </div>
      </div>
    </ToolCard>
  );
};
