import React, { useCallback, useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ToolCard } from '../../../../components/ToolCard';
import { TOOL_METADATA, ToolId, ToolComponentProps } from '../../../../types/tools';
import { useCopyToClipboard } from '../../../../hooks/useCopyToClipboard';
import { useToolInvocation } from '../../../../hooks/useToolInvocation';
import { loadToolDraft, useToolDraft } from '../../../../hooks/useToolDraft';
import { useInputHistory } from '../../../../hooks/useInputHistory';
import { InputHistoryDropdown } from '../../../../components/InputHistoryDropdown';

export type EntityMode = 'encode' | 'decode';
export type EncodeScope = 'all' | 'special';

const SPECIAL_CHARS: Record<string, string> = {
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
};

/**
 * 编码 HTML 实体
 */
export const encodeHtmlEntities = (text: string, scope: EncodeScope): string => {
  if (scope === 'special') {
    return text.replace(/[&<>"']/g, char => SPECIAL_CHARS[char] || char);
  }
  // 按 Unicode code point 编码，避免 emoji 被拆成两个代理项实体。
  return Array.from(text).map(char => {
    const code = char.codePointAt(0) ?? 0;
    if (code > 127 || SPECIAL_CHARS[char]) {
      return SPECIAL_CHARS[char] || `&#${code};`;
    }
    return char;
  }).join('');
};

/**
 * 解码 HTML 实体
 */
export const decodeHtmlEntities = (text: string): string => {
  const textarea = document.createElement('textarea');
  textarea.innerHTML = text;
  return textarea.value;
};

export const HTMLEntityTool: React.FC<ToolComponentProps> = ({
  isExpanded,
  onToggleExpand,
  invocation,
  onInvocationHandled,
}) => {
  const { t } = useTranslation();
  const { copy } = useCopyToClipboard();
  const initialDraft = useMemo(() => loadToolDraft('html-entity'), []);
  const [mode, setMode] = useState<EntityMode>(initialDraft?.mode === 'decode' ? 'decode' : 'encode');
  const [encodeScope, setEncodeScope] = useState<EncodeScope>('special');
  const [input, setInput] = useState(initialDraft?.input ?? '');
  const [output, setOutput] = useState(initialDraft?.output ?? '');
  const { addToHistory } = useInputHistory({ toolId: 'html-entity' });

  useToolDraft('html-entity', { input, output, mode });

  useToolInvocation({
    invocation,
    targetToolId: ToolId.HTML_ENTITY,
    onInvocationHandled,
    onApply: useCallback((nextInvocation) => {
      if (nextInvocation.mode === 'decode' || nextInvocation.mode === 'encode') {
        setMode(nextInvocation.mode);
      }
      setInput(nextInvocation.input);
    }, []),
  });

  useEffect(() => {
    if (!input) {
      setOutput('');
      return;
    }
    if (mode === 'encode') {
      setOutput(encodeHtmlEntities(input, encodeScope));
    } else {
      setOutput(decodeHtmlEntities(input));
    }
  }, [input, mode, encodeScope]);

  useEffect(() => {
    if (!input.trim() || !output) return;
    const timer = window.setTimeout(() => {
      addToHistory(input, { output, mode });
    }, 900);
    return () => window.clearTimeout(timer);
  }, [addToHistory, input, mode, output]);

  const handleClear = () => {
    setInput('');
    setOutput('');
  };

  return (
    <ToolCard tool={TOOL_METADATA[ToolId.HTML_ENTITY]} isExpanded={isExpanded} onToggleExpand={onToggleExpand}>
      <div className="h-full flex flex-col gap-4">
        <div className="flex items-center gap-4 flex-wrap flex-shrink-0">
          <div className="flex items-center gap-2">
            <label className="text-sm nb-text-secondary">{t('tools.htmlEntity.mode')}:</label>
            <select value={mode} onChange={e => setMode(e.target.value as EntityMode)}
              className="nb-input text-sm">
              <option value="encode">{t('tools.htmlEntity.encode')}</option>
              <option value="decode">{t('tools.htmlEntity.decode')}</option>
            </select>
          </div>
          {mode === 'encode' && (
            <div className="flex items-center gap-2">
              <label className="text-sm nb-text-secondary">{t('tools.htmlEntity.encodeScope')}:</label>
              <select value={encodeScope} onChange={e => setEncodeScope(e.target.value as EncodeScope)}
                className="nb-input text-sm">
                <option value="special">{t('tools.htmlEntity.special')}</option>
                <option value="all">{t('tools.htmlEntity.all')}</option>
              </select>
            </div>
          )}
          <InputHistoryDropdown
            toolId="html-entity"
            onSelect={setInput}
            onSelectOutput={setInput}
          />
          <button onClick={() => copy(output)} disabled={!output}
            className="nb-btn nb-btn-secondary text-sm">
            {t('tools.htmlEntity.copy')}
          </button>
          <button onClick={handleClear} className="nb-btn nb-btn-ghost text-sm">
            {t('tools.htmlEntity.clear')}
          </button>
        </div>

        <div className="flex-1 grid grid-cols-2 gap-4 min-h-0">
          <div className="flex flex-col min-h-0">
            <label className="block text-sm font-medium nb-text mb-2 flex-shrink-0">{t('tools.htmlEntity.input')}</label>
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder={t('tools.htmlEntity.inputPlaceholder')}
              className="nb-input flex-1 font-mono text-sm resize-none"
            />
          </div>
          <div className="flex flex-col min-h-0">
            <label className="block text-sm font-medium nb-text mb-2 flex-shrink-0">{t('tools.htmlEntity.output')}</label>
            <div className="flex-1 p-3 nb-bg nb-border rounded-lg overflow-auto font-mono text-sm whitespace-pre-wrap break-all nb-text">
              {output || <span className="nb-text-secondary">{t('tools.htmlEntity.emptyInput')}</span>}
            </div>
          </div>
        </div>
      </div>
    </ToolCard>
  );
};
