import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

type SearchBarMode = 'global' | 'history' | 'bookmark';

interface UnifiedSearchBarProps {
  mode: SearchBarMode;
  value: string;
  loading?: boolean;
  onChange: (value: string) => void;
  onSearch?: (value: string) => void;
  placeholder?: string;
}

const UnifiedSearchBar: React.FC<UnifiedSearchBarProps> = React.memo(({
  mode,
  value,
  loading = false,
  onChange,
  onSearch,
  placeholder,
}) => {
  const { t } = useTranslation();
  const placeholderText = placeholder ?? t('search.placeholder');

  const handleInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    onChange(event.target.value);
  }, [onChange]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && onSearch) {
      onSearch(value);
    }
  }, [onSearch, value]);

  const clearSearch = useCallback(() => {
    onChange('');
  }, [onChange]);

  return (
    <div className="relative w-full">
      {/* Neo-Brutalism 风格搜索框 */}
      <input
        type="text"
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholderText}
        className="nb-input w-full px-4 py-2 rounded-full"
      />
      {value && (
        <button
          onClick={clearSearch}
          className="absolute inset-y-0 right-0 flex items-center pr-3 text-secondary hover:text-[color:var(--nb-text)] transition-colors"
          aria-label={t('search.clear')}
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M6 18L18 6M6 6l12 12"
            ></path>
          </svg>
        </button>
      )}
      {loading && (
        <div className="absolute inset-y-0 right-0 flex items-center pr-3">
           <svg className="w-5 h-5 text-[color:var(--nb-accent-yellow)] animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
      )}
    </div>
  );
});

export default UnifiedSearchBar;
