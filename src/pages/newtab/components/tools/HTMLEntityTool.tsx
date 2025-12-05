import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ToolCard } from '../../../../components/ToolCard';
import { TOOL_METADATA, ToolId, ToolComponentProps } from '../../../../types/tools';
import { useCopyToClipboard } from '../../../../hooks/useCopyToClipboard';

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
  // 编码所有非 ASCII 字符
  return text.split('').map(char => {
    const code = char.charCodeAt(0);
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

export const HTMLEntityTool: React.FC<ToolComponentProps> = ({ isExpanded, onToggleExpand }) => {
  const { t } = useTranslation();
  const { copy } = useCopyToClipboard();
  const [mode, setMode] = useState<EntityMode>('encode');
  const [encodeScope, setEncodeScope] = useState<EncodeScope>('special');
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');

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
