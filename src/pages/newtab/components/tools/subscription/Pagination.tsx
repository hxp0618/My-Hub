/**
 * 分页组件
 * 支持页码切换、每页数量选择，遵循 Neo-Brutalism 设计规范
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import { PAGE_SIZE_OPTIONS, PageSizeOption } from '../../../../../types/subscription';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: PageSizeOption) => void;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
}) => {
  const { t } = useTranslation();

  // 如果总数小于等于最小页面大小，不显示分页
  if (totalItems <= PAGE_SIZE_OPTIONS[0]) {
    return null;
  }

  // 生成页码按钮
  const getPageNumbers = (): (number | 'ellipsis')[] => {
    const pages: (number | 'ellipsis')[] = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
      // 总页数较少，显示所有页码
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // 总页数较多，显示部分页码
      if (currentPage <= 3) {
        // 当前页靠近开头
        for (let i = 1; i <= 4; i++) {
          pages.push(i);
        }
        pages.push('ellipsis');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        // 当前页靠近结尾
        pages.push(1);
        pages.push('ellipsis');
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        // 当前页在中间
        pages.push(1);
        pages.push('ellipsis');
        pages.push(currentPage - 1);
        pages.push(currentPage);
        pages.push(currentPage + 1);
        pages.push('ellipsis');
        pages.push(totalPages);
      }
    }

    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <div className="flex items-center justify-between mt-4 px-2">
      {/* 左侧：总数信息 */}
      <div className="text-sm nb-text-secondary">
        {t('subscriptions.pagination.total', { count: totalItems })}
      </div>

      {/* 中间：页码按钮 */}
      <div className="flex items-center gap-1">
        {/* 上一页 */}
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className={`p-1.5 rounded border-2 border-[var(--nb-border)] transition-all ${
            currentPage === 1
              ? 'opacity-40 cursor-not-allowed bg-gray-100 dark:bg-gray-700'
              : 'nb-card hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0px_0px_var(--nb-border)]'
          }`}
          title={t('subscriptions.pagination.prev')}
        >
          <span className="material-symbols-outlined text-sm">chevron_left</span>
        </button>

        {/* 页码 */}
        {pageNumbers.map((page, index) => (
          page === 'ellipsis' ? (
            <span key={`ellipsis-${index}`} className="px-2 nb-text-secondary">
              ...
            </span>
          ) : (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              className={`min-w-[32px] h-8 px-2 rounded border-2 border-[var(--nb-border)] text-sm font-medium transition-all ${
                currentPage === page
                  ? 'bg-[var(--nb-accent-yellow)] shadow-[2px_2px_0px_0px_var(--nb-border)]'
                  : 'nb-card hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0px_0px_var(--nb-border)]'
              }`}
            >
              {page}
            </button>
          )
        ))}

        {/* 下一页 */}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className={`p-1.5 rounded border-2 border-[var(--nb-border)] transition-all ${
            currentPage === totalPages
              ? 'opacity-40 cursor-not-allowed bg-gray-100 dark:bg-gray-700'
              : 'nb-card hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0px_0px_var(--nb-border)]'
          }`}
          title={t('subscriptions.pagination.next')}
        >
          <span className="material-symbols-outlined text-sm">chevron_right</span>
        </button>
      </div>

      {/* 右侧：每页数量选择 */}
      <div className="flex items-center gap-2">
        <span className="text-sm nb-text-secondary">
          {t('subscriptions.pagination.pageSize')}
        </span>
        <select
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value) as PageSizeOption)}
          className="nb-input text-sm py-1 px-2 min-w-[70px]"
        >
          {PAGE_SIZE_OPTIONS.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default Pagination;
