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
    <div
      className={`unified-search unified-search--${mode}`}
      role="search"
      aria-label={placeholderText}
    >
      {/* 左侧固定搜索标识，避免输入内容和图标重叠 */}
      <div className="unified-search-icon" aria-hidden="true">
        <span className="material-symbols-outlined text-xl">search</span>
      </div>

      {/* Neo-Brutalism 搜索框 */}
      <input
        type="text"
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        data-search-mode={mode}
        aria-label={placeholderText}
        placeholder={placeholderText}
        className="nb-input unified-search-input"
      />

      {/* 清除按钮 */}
      {value && !loading && (
        <button
          type="button"
          onClick={clearSearch}
          className="unified-search-action unified-search-clear"
          aria-label={t('search.clear')}
        >
          <span className="material-symbols-outlined text-base" aria-hidden="true">close</span>
        </button>
      )}

      {/* 加载状态 */}
      {loading && (
        <div className="unified-search-action unified-search-loading" role="status" aria-label={t('search.searching')}>
          <span className="unified-search-spinner" aria-hidden="true" />
        </div>
      )}
    </div>
  );
});

export default UnifiedSearchBar;
