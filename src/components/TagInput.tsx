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
    <div className="nb-card-static p-0 overflow-hidden">
      <div className="flex flex-wrap gap-2 p-3">
        {tags.map((tag, index) => (
          <span key={tag} className={getTagClassName(index, 'flex items-center')}>
            {tag}
            <button onClick={() => removeTag(tag)} className="ml-2 hover:opacity-70 transition-opacity font-bold">
              &times;
            </button>
          </span>
        ))}
      </div>
      <input
        type="text"
        value={inputValue}
        onChange={e => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={t('common.tagInputPlaceholder')}
        className="w-full px-4 py-3 bg-[color:var(--nb-card)] text-[color:var(--nb-text)] border-t-[length:var(--nb-border-width)] border-[color:var(--nb-border)] focus:outline-none transition-colors"
      />
    </div>
  );
});

export default TagInput;
