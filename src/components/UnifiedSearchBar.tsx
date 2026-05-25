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
    <div className="relative w-full group">
      {/* 搜索图标 */}
      <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none z-10">
        <span className="material-symbols-outlined text-xl nb-text-secondary">search</span>
      </div>

      {/* Neo-Brutalism 风格搜索框 */}
      <input
        type="text"
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        data-search-mode={mode}
        placeholder={placeholderText}
        className="nb-input w-full pr-12 py-4 rounded-full text-base placeholder:uppercase placeholder:tracking-wide placeholder:text-xs shadow-[4px_4px_0px_0px_var(--nb-border)] focus:shadow-[6px_6px_0px_0px_var(--nb-border)] focus:translate-x-[-2px] focus:translate-y-[-2px]"
        style={{ paddingLeft: '3rem' }}
      />

      {/* 清除按钮 */}
      {value && !loading && (
        <button
          onClick={clearSearch}
          className="absolute inset-y-0 right-3 flex items-center justify-center w-8 h-8 my-auto rounded-full border-2 border-[color:var(--nb-border)] bg-[color:var(--nb-card)] hover:bg-[color:var(--nb-accent-pink)] transition-all duration-150 shadow-[2px_2px_0px_0px_var(--nb-border)] hover:shadow-[1px_1px_0px_0px_var(--nb-border)] hover:translate-x-[1px] hover:translate-y-[1px]"
          aria-label={t('search.clear')}
        >
          <span className="material-symbols-outlined text-base nb-text">close</span>
        </button>
      )}

      {/* 加载状态 */}
      {loading && (
        <div className="absolute inset-y-0 right-3 flex items-center justify-center w-8 h-8 my-auto rounded-full border-2 border-[color:var(--nb-border)] bg-[color:var(--nb-accent-yellow)]">
          <svg className="w-5 h-5 nb-text animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
      )}
    </div>
  );
});

export default UnifiedSearchBar;
