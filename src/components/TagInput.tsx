import React, { useState, KeyboardEvent, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { getTagClassName } from '../utils/tagColorUtils';

interface TagInputProps {
  tags: string[];
  setTags: (tags: string[]) => void;
}

const TagInput: React.FC<TagInputProps> = React.memo(({ tags, setTags }) => {
  const { t } = useTranslation();
  const [inputValue, setInputValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  const handleKeyDown = useCallback((event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      const newTag = inputValue.trim();
      if (newTag && !tags.includes(newTag)) {
        setTags([...tags, newTag]);
      }
      setInputValue('');
    }
  }, [inputValue, tags, setTags]);

  const removeTag = useCallback((tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  }, [tags, setTags]);

  return (
    <div className={`nb-card-static p-0 overflow-hidden transition-all duration-150 ${
      isFocused 
        ? 'shadow-[6px_6px_0px_0px_var(--nb-border)] -translate-x-[1px] -translate-y-[1px]' 
        : 'shadow-[4px_4px_0px_0px_var(--nb-border)]'
    }`}>
      {/* 标签显示区域 */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2 p-4 border-b-2 border-[color:var(--nb-border)]">
          {tags.map((tag, index) => (
            <span 
              key={tag} 
              className={getTagClassName(index, 'flex items-center shadow-[2px_2px_0px_0px_var(--nb-border)] hover:shadow-[1px_1px_0px_0px_var(--nb-border)] hover:translate-x-[1px] hover:translate-y-[1px] transition-all duration-100')}
            >
              <span className="font-bold uppercase tracking-wide">{tag}</span>
              <button 
                onClick={() => removeTag(tag)} 
                className="ml-2 w-5 h-5 flex items-center justify-center bg-[color:var(--nb-card)] border border-[color:var(--nb-border)] hover:bg-[color:var(--nb-accent-pink)] transition-colors"
              >
                <span className="text-xs font-bold">×</span>
              </button>
            </span>
          ))}
        </div>
      )}
      
      {/* 输入区域 */}
      <div className="relative">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center bg-[color:var(--nb-accent-yellow)] border-2 border-[color:var(--nb-border)]">
          <span className="material-symbols-outlined text-xs nb-text">add</span>
        </div>
        <input
          type="text"
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={t('common.tagInputPlaceholder')}
          className="w-full pl-14 pr-4 py-4 bg-[color:var(--nb-card)] text-[color:var(--nb-text)] focus:outline-none transition-colors font-medium text-sm uppercase tracking-wide placeholder:normal-case placeholder:tracking-normal"
        />
      </div>
    </div>
  );
});

export default TagInput;
