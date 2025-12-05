import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ToolCard } from '../../../../components/ToolCard';
import { TOOL_METADATA, ToolId, ToolComponentProps } from '../../../../types/tools';
import { useCopyToClipboard } from '../../../../hooks/useCopyToClipboard';

export type LoremMode = 'paragraphs' | 'words';
export type LoremLanguage = 'latin' | 'chinese';

const LOREM_WORDS = [
  'lorem', 'ipsum', 'dolor', 'sit', 'amet', 'consectetur', 'adipiscing', 'elit',
  'sed', 'do', 'eiusmod', 'tempor', 'incididunt', 'ut', 'labore', 'et', 'dolore',
  'magna', 'aliqua', 'enim', 'ad', 'minim', 'veniam', 'quis', 'nostrud',
  'exercitation', 'ullamco', 'laboris', 'nisi', 'aliquip', 'ex', 'ea', 'commodo',
];

const CHINESE_WORDS = [
  '天地', '玄黄', '宇宙', '洪荒', '日月', '盈昃', '辰宿', '列张', '寒来', '暑往',
  '秋收', '冬藏', '闰余', '成岁', '律吕', '调阳', '云腾', '致雨', '露结', '为霜',
  '金生', '丽水', '玉出', '昆冈', '剑号', '巨阙', '珠称', '夜光', '果珍', '李柰',
];

/**
 * 生成 Lorem Ipsum 文本
 */
export const generateLoremIpsum = (
  mode: LoremMode,
  count: number,
  language: LoremLanguage
): string => {
  const words = language === 'latin' ? LOREM_WORDS : CHINESE_WORDS;
  const separator = language === 'latin' ? ' ' : '';

  if (mode === 'words') {
    const result: string[] = [];
    for (let i = 0; i < count; i++) {
      result.push(words[i % words.length]);
    }
    return result.join(separator);
  }

  // paragraphs mode
  const paragraphs: string[] = [];
  for (let p = 0; p < count; p++) {
    const sentenceCount = 4 + Math.floor(Math.random() * 4);
    const sentences: string[] = [];
    for (let s = 0; s < sentenceCount; s++) {
      const wordCount = 8 + Math.floor(Math.random() * 8);
      const sentenceWords: string[] = [];
      for (let w = 0; w < wordCount; w++) {
        sentenceWords.push(words[Math.floor(Math.random() * words.length)]);
      }
      let sentence = sentenceWords.join(separator);
      sentence = sentence.charAt(0).toUpperCase() + sentence.slice(1);
      sentences.push(sentence + (language === 'latin' ? '.' : '。'));
    }
    paragraphs.push(sentences.join(language === 'latin' ? ' ' : ''));
  }
  return paragraphs.join('\n\n');
};

export const LoremIpsumTool: React.FC<ToolComponentProps> = ({ isExpanded, onToggleExpand }) => {
  const { t } = useTranslation();
  const { copy } = useCopyToClipboard();
  const [mode, setMode] = useState<LoremMode>('paragraphs');
  const [count, setCount] = useState(3);
  const [language, setLanguage] = useState<LoremLanguage>('latin');
  const [output, setOutput] = useState('');

  const handleGenerate = useCallback(() => {
    setOutput(generateLoremIpsum(mode, count, language));
  }, [mode, count, language]);

  return (
    <ToolCard tool={TOOL_METADATA[ToolId.LOREM_IPSUM]} isExpanded={isExpanded} onToggleExpand={onToggleExpand}>
      <div className="h-full flex flex-col gap-4">
        <div className="flex items-center gap-4 flex-wrap flex-shrink-0">
          <div className="flex items-center gap-2">
            <label className="text-sm nb-text-secondary">{t('tools.loremIpsum.mode')}:</label>
            <select value={mode} onChange={e => setMode(e.target.value as LoremMode)}
              className="nb-input text-sm">
              <option value="paragraphs">{t('tools.loremIpsum.paragraphs')}</option>
              <option value="words">{t('tools.loremIpsum.words')}</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm nb-text-secondary">{t('tools.loremIpsum.count')}:</label>
            <input type="number" min={1} max={mode === 'paragraphs' ? 20 : 500} value={count}
              onChange={e => setCount(Math.max(1, parseInt(e.target.value) || 1))}
              className="nb-input w-20 text-sm" />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm nb-text-secondary">{t('tools.loremIpsum.language')}:</label>
            <select value={language} onChange={e => setLanguage(e.target.value as LoremLanguage)}
              className="nb-input text-sm">
              <option value="latin">{t('tools.loremIpsum.latin')}</option>
              <option value="chinese">{t('tools.loremIpsum.chinese')}</option>
            </select>
          </div>
          <button onClick={handleGenerate} className="nb-btn nb-btn-primary text-sm">
            {t('tools.loremIpsum.generate')}
          </button>
          <button onClick={() => copy(output)} disabled={!output}
            className="nb-btn nb-btn-secondary text-sm">
            {t('tools.loremIpsum.copy')}
          </button>
        </div>
        <div className="flex-1 flex flex-col min-h-0">
          <label className="block text-sm font-medium nb-text mb-2 flex-shrink-0">{t('tools.loremIpsum.result')}</label>
          <div className="flex-1 p-3 nb-card-static overflow-auto text-sm whitespace-pre-wrap nb-text">
            {output || <span className="nb-text-secondary">{t('tools.loremIpsum.emptyResult')}</span>}
          </div>
        </div>
      </div>
    </ToolCard>
  );
};
