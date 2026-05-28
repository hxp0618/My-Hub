import React from 'react';
import { useTranslation } from 'react-i18next';
import UnifiedSearchBar from '../../../components/UnifiedSearchBar';
import { FailedBookmarksIndicator } from '../../../components/FailedBookmarksIndicator';
import { EnhancedBookmark } from '../../../types/bookmarks';
import { getFaviconUrl } from '../../../utils/bookmarkUtils';
import { getUrlHostname } from '../../../utils/favicon';
import {
  analyzeBookmarkHealth,
  BookmarkHealthIssue,
} from '../../../utils/bookmarkHealth';
import { SortOrder } from '../types';
import { formatDate } from '../utils';
import { BookmarkHealthOverview } from './BookmarkHealthOverview';
import { ItemCard } from './ItemCard';
import {
  cardsPerRow as cardsPerRowStorage,
  parseCardsPerRowValue,
  type StorageValues,
  StorageKey,
} from '../../../utils/storageManager';

type BookmarkCardAction = {
  label: string;
  icon: string;
  onClick: () => void;
};

const getGridClass = (cardsPerRow: StorageValues[StorageKey.CARDS_PER_ROW]) => {
  const baseClass = 'grid gap-6 transition-all duration-300';
  switch (cardsPerRow) {
    case 2:
      return `${baseClass} grid-cols-1 md:grid-cols-2`;
    case 3:
      return `${baseClass} grid-cols-1 md:grid-cols-2 lg:grid-cols-3`;
    case 4:
      return `${baseClass} grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`;
    case 5:
      return `${baseClass} grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5`;
    case 6:
      return `${baseClass} grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6`;
    default:
      return `${baseClass} grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`;
  }
};

export const BookmarkPageHeader: React.FC<{
  title: string;
  isSidebarCollapsed: boolean;
  isMultiSelectMode: boolean;
  searchTerm: string;
  loading: boolean;
  sortOrder: SortOrder;
  cardsPerRow: StorageValues[StorageKey.CARDS_PER_ROW];
  showMoreMenu: boolean;
  moreMenuRef: React.RefObject<HTMLDivElement | null>;
  activeHealthIssue: BookmarkHealthIssue | null;
  failureCount: number;
  onToggleSidebar: () => void;
  onClearHealthIssue: () => void;
  onRetryFailedTags: () => void;
  onAddBookmark: () => void;
  onSearchTermChange: (value: string) => void;
  onSortChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
  onCardsPerRowChange: (value: StorageValues[StorageKey.CARDS_PER_ROW]) => void;
  onToggleMoreMenu: () => void;
  onCloseMoreMenu: () => void;
  onToggleMultiSelectMode: () => void;
  onRegenerateAllTags: () => void;
  onStartDeduplicate: () => void;
  onOpenReorderConfirm: () => void;
}> = ({
  title,
  isSidebarCollapsed,
  isMultiSelectMode,
  searchTerm,
  loading,
  sortOrder,
  cardsPerRow,
  showMoreMenu,
  moreMenuRef,
  activeHealthIssue,
  failureCount,
  onToggleSidebar,
  onClearHealthIssue,
  onRetryFailedTags,
  onAddBookmark,
  onSearchTermChange,
  onSortChange,
  onCardsPerRowChange,
  onToggleMoreMenu,
  onCloseMoreMenu,
  onToggleMultiSelectMode,
  onRegenerateAllTags,
  onStartDeduplicate,
  onOpenReorderConfirm,
}) => {
  const { t } = useTranslation();

  const handleCardsPerRowChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newValue = parseCardsPerRowValue(event.target.value);
    if (newValue === null) return;
    onCardsPerRowChange(newValue);
    cardsPerRowStorage.set(newValue);
    window.dispatchEvent(new CustomEvent('cardsPerRowChanged', { detail: newValue }));
  };

  return (
    <header className="bookmark-page-header nb-bg nb-border nb-shadow">
      <div className="bookmark-page-title-row">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="bookmark-page-sidebar-toggle nb-btn nb-btn-ghost p-2 rounded-md"
          title={isSidebarCollapsed ? t('bookmarks.expand') : t('bookmarks.collapse')}
          aria-label={isSidebarCollapsed ? t('bookmarks.expand') : t('bookmarks.collapse')}
          aria-expanded={!isSidebarCollapsed}
        >
          <span className="material-symbols-outlined icon-linear text-lg">
            {isSidebarCollapsed ? 'menu_open' : 'menu'}
          </span>
        </button>
        <h2 className="bookmark-page-title text-xl font-bold nb-text">{title}</h2>
        {activeHealthIssue && (
          <button
            type="button"
            onClick={onClearHealthIssue}
            className="nb-btn nb-btn-ghost px-3 py-1 text-xs"
          >
            {t('bookmarks.health.clearFilter')}
          </button>
        )}
        <FailedBookmarksIndicator failureCount={failureCount} onRetryClick={onRetryFailedTags} />
      </div>
      <div className="bookmark-page-actions">
        {!isMultiSelectMode && (
          <button
            type="button"
            onClick={onAddBookmark}
            className="bookmark-page-add-button nb-btn nb-btn-primary flex items-center gap-2 px-4 py-2"
          >
            <span className="material-symbols-outlined icon-linear text-lg">add</span>
            <span className="font-medium">{t('history.addBookmark')}</span>
          </button>
        )}
        <div className="bookmark-page-search">
          <UnifiedSearchBar
            mode="bookmark"
            value={searchTerm}
            onChange={onSearchTermChange}
            placeholder={t('bookmarks.searchPlaceholder')}
            loading={loading}
          />
        </div>
        <div className="bookmark-page-sort">
          <select
            aria-label={t('bookmarks.sortBy')}
            value={`${sortOrder.key}-${sortOrder.order}`}
            onChange={onSortChange}
            className="bookmark-page-select nb-input px-4 py-2 appearance-none cursor-pointer"
          >
            <option value="dateAdded-desc">{t('bookmarks.sortByDateAddedDesc')}</option>
            <option value="dateAdded-asc">{t('bookmarks.sortByDateAddedAsc')}</option>
            <option value="dateLastUsed-desc">{t('bookmarks.sortByDateLastUsedDesc')}</option>
            <option value="dateLastUsed-asc">{t('bookmarks.sortByDateLastUsedAsc')}</option>
            <option value="title-asc">{t('bookmarks.sortByNameAsc')}</option>
            <option value="title-desc">{t('bookmarks.sortByNameDesc')}</option>
          </select>
        </div>
        <div className="bookmark-page-density-select nb-card-static flex items-center space-x-2 px-3 py-2">
          <span className="material-symbols-outlined icon-linear text-sm text-[color:var(--nb-text)]">grid_view</span>
          <select
            aria-label={t('settings.cardsPerRow')}
            value={cardsPerRow}
            onChange={handleCardsPerRowChange}
            className="text-sm border-0 bg-transparent focus:outline-none focus:ring-0 cursor-pointer text-[color:var(--nb-text)]"
          >
            <option value="2">{t('settings.cardsPerRowOption', { count: 2 })}</option>
            <option value="3">{t('settings.cardsPerRowOption', { count: 3 })}</option>
            <option value="4">{t('settings.cardsPerRowOption', { count: 4 })}</option>
            <option value="5">{t('settings.cardsPerRowOption', { count: 5 })}</option>
            <option value="6">{t('settings.cardsPerRowOption', { count: 6 })}</option>
          </select>
        </div>
        <div className="relative" ref={moreMenuRef}>
          <button
            type="button"
            onClick={onToggleMoreMenu}
            className="bookmark-page-more-button nb-btn nb-btn-ghost p-2 rounded-full"
            aria-label={t('bookmarks.moreActions')}
            aria-expanded={showMoreMenu}
            aria-haspopup="menu"
          >
            <span className="material-symbols-outlined icon-linear text-lg">more_vert</span>
          </button>
          {showMoreMenu && (
            <div className="nb-dropdown absolute right-0 mt-2 w-56 z-10" role="menu">
              <div className="py-1">
                <button
                  type="button"
                  onClick={() => {
                    onToggleMultiSelectMode();
                    onCloseMoreMenu();
                  }}
                  className="nb-dropdown-item w-full flex items-center gap-3 text-sm font-medium cursor-pointer"
                  role="menuitem"
                >
                  <span className="material-symbols-outlined icon-linear text-lg nb-text-secondary">checklist</span>
                  {t('bookmarks.select')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onRegenerateAllTags();
                    onCloseMoreMenu();
                  }}
                  className="nb-dropdown-item w-full flex items-center gap-3 text-sm font-medium cursor-pointer"
                  role="menuitem"
                >
                  <span className="material-symbols-outlined icon-linear text-lg nb-text-secondary">refresh</span>
                  {t('bookmarks.regenerateAllTags')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onStartDeduplicate();
                    onCloseMoreMenu();
                  }}
                  className="nb-dropdown-item w-full flex items-center gap-3 text-sm font-medium cursor-pointer"
                  role="menuitem"
                >
                  <span className="material-symbols-outlined icon-linear text-lg nb-text-secondary">content_copy</span>
                  {t('bookmarks.deduplicate')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onOpenReorderConfirm();
                    onCloseMoreMenu();
                  }}
                  className="nb-dropdown-item w-full flex items-center gap-3 text-sm font-medium cursor-pointer"
                  role="menuitem"
                >
                  <span className="material-symbols-outlined icon-linear text-lg nb-text-secondary">sort</span>
                  {t('bookmarks.updateChromeOrder')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export const BookmarkGrid: React.FC<{
  bookmarks: EnhancedBookmark[];
  searchTerm: string;
  sortOrder: SortOrder;
  cardsPerRow: StorageValues[StorageKey.CARDS_PER_ROW];
  isMultiSelectMode: boolean;
  selectedBookmarkIds: string[];
  getBookmarkActions: (item: EnhancedBookmark) => BookmarkCardAction[];
  onToggleBookmarkSelection: (id: string) => void;
  onBookmarkDragStart: (event: React.DragEvent<HTMLDivElement>, item: EnhancedBookmark) => void;
  onBookmarkDragEnd: () => void;
}> = ({
  bookmarks,
  searchTerm,
  sortOrder,
  cardsPerRow,
  isMultiSelectMode,
  selectedBookmarkIds,
  getBookmarkActions,
  onToggleBookmarkSelection,
  onBookmarkDragStart,
  onBookmarkDragEnd,
}) => {
  const { t } = useTranslation();

  return (
    <div className={`bookmark-page-grid ${getGridClass(cardsPerRow)}`}>
      {bookmarks.length > 0 ? bookmarks.map(item => {
        const dateToDisplay = sortOrder.key === 'dateLastUsed' ? item.dateLastUsed : item.dateAdded;

        return (
          <ItemCard
            key={item.id}
            href={item.url!}
            title={item.title}
            hostname={getUrlHostname(item.url)}
            faviconUrl={getFaviconUrl(item.url!)}
            tags={item.tags}
            actions={getBookmarkActions(item)}
            timeLabel={dateToDisplay ? formatDate(dateToDisplay) : undefined}
            isMultiSelectMode={isMultiSelectMode}
            isSelected={selectedBookmarkIds.includes(item.id)}
            onSelect={() => onToggleBookmarkSelection(item.id)}
            dragProps={{
              draggable: !isMultiSelectMode,
              onDragStart: (event: React.DragEvent<HTMLDivElement>) => onBookmarkDragStart(event, item),
              onDragEnd: onBookmarkDragEnd,
            }}
          />
        );
      }) : (
        <p className="text-center nb-text-secondary pt-10 col-span-full">
          {searchTerm ? t('bookmarks.noResults') : t('bookmarks.emptyFolder')}
        </p>
      )}
    </div>
  );
};

export const BookmarkMainContent: React.FC<{
  headerTitle: string;
  isSidebarCollapsed: boolean;
  isMultiSelectMode: boolean;
  searchTerm: string;
  loading: boolean;
  sortOrder: SortOrder;
  cardsPerRow: StorageValues[StorageKey.CARDS_PER_ROW];
  showMoreMenu: boolean;
  moreMenuRef: React.RefObject<HTMLDivElement | null>;
  activeHealthIssue: BookmarkHealthIssue | null;
  failureCount: number;
  healthReport: ReturnType<typeof analyzeBookmarkHealth>;
  bookmarksToDisplay: EnhancedBookmark[];
  selectedBookmarkIds: string[];
  getBookmarkActions: (item: EnhancedBookmark) => BookmarkCardAction[];
  onToggleSidebar: () => void;
  onClearHealthIssue: () => void;
  onRetryFailedTags: () => void;
  onAddBookmark: () => void;
  onSearchTermChange: (value: string) => void;
  onSortChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
  onCardsPerRowChange: (value: StorageValues[StorageKey.CARDS_PER_ROW]) => void;
  onToggleMoreMenu: () => void;
  onCloseMoreMenu: () => void;
  onToggleMultiSelectMode: () => void;
  onRegenerateAllTags: () => void;
  onStartDeduplicate: () => void;
  onOpenReorderConfirm: () => void;
  onSelectHealthIssue: (issue: BookmarkHealthIssue) => void;
  onToggleBookmarkSelection: (id: string) => void;
  onBookmarkDragStart: (event: React.DragEvent<HTMLDivElement>, item: EnhancedBookmark) => void;
  onBookmarkDragEnd: () => void;
}> = ({
  headerTitle,
  isSidebarCollapsed,
  isMultiSelectMode,
  searchTerm,
  loading,
  sortOrder,
  cardsPerRow,
  showMoreMenu,
  moreMenuRef,
  activeHealthIssue,
  failureCount,
  healthReport,
  bookmarksToDisplay,
  selectedBookmarkIds,
  getBookmarkActions,
  onToggleSidebar,
  onClearHealthIssue,
  onRetryFailedTags,
  onAddBookmark,
  onSearchTermChange,
  onSortChange,
  onCardsPerRowChange,
  onToggleMoreMenu,
  onCloseMoreMenu,
  onToggleMultiSelectMode,
  onRegenerateAllTags,
  onStartDeduplicate,
  onOpenReorderConfirm,
  onSelectHealthIssue,
  onToggleBookmarkSelection,
  onBookmarkDragStart,
  onBookmarkDragEnd,
}) => (
  <main className="bookmark-main-content">
    <BookmarkPageHeader
      title={headerTitle}
      isSidebarCollapsed={isSidebarCollapsed}
      isMultiSelectMode={isMultiSelectMode}
      searchTerm={searchTerm}
      loading={loading}
      sortOrder={sortOrder}
      cardsPerRow={cardsPerRow}
      showMoreMenu={showMoreMenu}
      moreMenuRef={moreMenuRef}
      activeHealthIssue={activeHealthIssue}
      failureCount={failureCount}
      onToggleSidebar={onToggleSidebar}
      onClearHealthIssue={onClearHealthIssue}
      onRetryFailedTags={onRetryFailedTags}
      onAddBookmark={onAddBookmark}
      onSearchTermChange={onSearchTermChange}
      onSortChange={onSortChange}
      onCardsPerRowChange={onCardsPerRowChange}
      onToggleMoreMenu={onToggleMoreMenu}
      onCloseMoreMenu={onCloseMoreMenu}
      onToggleMultiSelectMode={onToggleMultiSelectMode}
      onRegenerateAllTags={onRegenerateAllTags}
      onStartDeduplicate={onStartDeduplicate}
      onOpenReorderConfirm={onOpenReorderConfirm}
    />

    <BookmarkHealthOverview
      report={healthReport}
      activeIssue={activeHealthIssue}
      onSelectIssue={onSelectHealthIssue}
    />

    <BookmarkGrid
      bookmarks={bookmarksToDisplay}
      searchTerm={searchTerm}
      sortOrder={sortOrder}
      cardsPerRow={cardsPerRow}
      isMultiSelectMode={isMultiSelectMode}
      selectedBookmarkIds={selectedBookmarkIds}
      getBookmarkActions={getBookmarkActions}
      onToggleBookmarkSelection={onToggleBookmarkSelection}
      onBookmarkDragStart={onBookmarkDragStart}
      onBookmarkDragEnd={onBookmarkDragEnd}
    />
  </main>
);
