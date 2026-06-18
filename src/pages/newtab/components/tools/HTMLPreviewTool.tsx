import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ToolCard } from '../../../../components/ToolCard';
import { TOOL_METADATA, ToolId, ToolComponentProps } from '../../../../types/tools';
import { useCopyToClipboard } from '../../../../hooks/useCopyToClipboard';

type ViewMode = 'edit' | 'preview' | 'split';

const SANDBOX_FLAGS = ['allow-forms', 'allow-modals', 'allow-popups', 'allow-downloads'];

const escapeHtml = (value: string): string => (
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
);

export const getHtmlPreviewSandbox = (allowScripts: boolean): string => (
  allowScripts ? [...SANDBOX_FLAGS, 'allow-scripts'].join(' ') : SANDBOX_FLAGS.join(' ')
);

export const buildHtmlPreviewSrcDoc = (html: string, emptyText: string): string => {
  if (html.trim()) return html;

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      html, body {
        height: 100%;
        margin: 0;
      }
      body {
        display: grid;
        place-items: center;
        color: #64748b;
        font: 14px/1.5 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }
    </style>
  </head>
  <body>${escapeHtml(emptyText)}</body>
</html>`;
};

export const HTMLPreviewTool: React.FC<ToolComponentProps> = ({ isExpanded, onToggleExpand }) => {
  const { t } = useTranslation();
  const { copy } = useCopyToClipboard();
  const [html, setHtml] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('split');
  const [allowScripts, setAllowScripts] = useState(false);

  const srcDoc = useMemo(
    () => buildHtmlPreviewSrcDoc(html, t('tools.htmlPreview.emptyPreview')),
    [html, t],
  );
  const sandbox = useMemo(() => getHtmlPreviewSandbox(allowScripts), [allowScripts]);

  const handleClear = () => {
    setHtml('');
  };

  const handleOpenPreview = () => {
    if (!html.trim()) return;

    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank', 'noopener,noreferrer');
    window.setTimeout(() => URL.revokeObjectURL(url), 30000);
  };

  const showEditor = viewMode === 'edit' || viewMode === 'split';
  const showPreview = viewMode === 'preview' || viewMode === 'split';

  return (
    <ToolCard tool={TOOL_METADATA[ToolId.HTML_PREVIEW]} isExpanded={isExpanded} onToggleExpand={onToggleExpand}>
      <div className="h-full flex flex-col gap-4">
        <div className="flex items-center gap-4 flex-wrap flex-shrink-0">
          <div className="flex items-center gap-2">
            <label className="text-sm nb-text-secondary">{t('tools.htmlPreview.viewMode')}:</label>
            <select
              value={viewMode}
              onChange={e => setViewMode(e.target.value as ViewMode)}
              className="nb-input text-sm"
            >
              <option value="edit">{t('tools.htmlPreview.edit')}</option>
              <option value="preview">{t('tools.htmlPreview.preview')}</option>
              <option value="split">{t('tools.htmlPreview.split')}</option>
            </select>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={allowScripts}
              onChange={e => setAllowScripts(e.target.checked)}
              className="w-4 h-4 rounded nb-border accent-[var(--nb-accent-yellow)]"
            />
            <span className="text-sm nb-text-secondary">{t('tools.htmlPreview.allowScripts')}</span>
          </label>

          <div className="flex gap-2 ml-auto">
            <button
              onClick={handleOpenPreview}
              disabled={!html.trim()}
              className="nb-btn nb-btn-primary text-sm"
            >
              {t('tools.htmlPreview.openPreview')}
            </button>
            <button
              onClick={() => copy(html)}
              disabled={!html}
              className="nb-btn nb-btn-secondary text-sm"
            >
              {t('tools.htmlPreview.copy')}
            </button>
            <button onClick={handleClear} className="nb-btn nb-btn-ghost text-sm">
              {t('tools.htmlPreview.clear')}
            </button>
          </div>
        </div>

        <div className={`flex-1 min-h-0 ${viewMode === 'split' ? 'grid grid-cols-2 gap-4' : ''}`}>
          {showEditor && (
            <div className="flex flex-col min-h-0">
              <label className="block text-sm font-medium nb-text mb-2 flex-shrink-0">
                {t('tools.htmlPreview.input')}
              </label>
              <textarea
                value={html}
                onChange={e => setHtml(e.target.value)}
                placeholder={t('tools.htmlPreview.inputPlaceholder')}
                className="nb-input flex-1 font-mono text-sm resize-none"
              />
            </div>
          )}

          {showPreview && (
            <div className="flex flex-col min-h-0">
              <label className="block text-sm font-medium nb-text mb-2 flex-shrink-0">
                {t('tools.htmlPreview.previewTitle')}
              </label>
              <iframe
                title={t('tools.htmlPreview.frameTitle')}
                srcDoc={srcDoc}
                sandbox={sandbox}
                referrerPolicy="no-referrer"
                className="flex-1 w-full min-h-0 nb-bg nb-border rounded-lg"
              />
            </div>
          )}
        </div>
      </div>
    </ToolCard>
  );
};
