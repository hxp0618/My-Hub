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
    <div className={`tag-input nb-card-static ${isFocused ? 'is-focused' : ''}`}>
      {/* 标签显示区域 */}
      {tags.length > 0 && (
        <div className="tag-input-list" aria-label={t('common.tags')}>
          {tags.map((tag, index) => (
            <span 
              key={tag} 
              className={getTagClassName(index, 'tag-input-badge')}
            >
              <span className="font-bold uppercase tracking-wide">{tag}</span>
              <button 
                type="button"
                onClick={() => removeTag(tag)} 
                className="tag-input-remove"
                aria-label={t('common.removeTag', { tag })}
              >
                <span className="material-symbols-outlined text-base" aria-hidden="true">close</span>
              </button>
            </span>
          ))}
        </div>
      )}
      
      {/* 输入区域 */}
      <div className="tag-input-field">
        <div className="tag-input-icon" aria-hidden="true">
          <span className="material-symbols-outlined text-sm nb-text">add</span>
        </div>
        <input
          type="text"
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={t('common.tagInputPlaceholder')}
          aria-label={t('common.tagInputPlaceholder')}
          className="tag-input-control"
        />
      </div>
    </div>
  );
});

export default TagInput;
