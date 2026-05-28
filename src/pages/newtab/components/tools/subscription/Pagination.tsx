/**
 * 分页组件
 * 支持页码切换、每页数量选择，遵循 Neo-Brutalism 设计规范
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  PAGE_SIZE_OPTIONS,
  PageSizeOption,
  parsePageSizeOption,
} from '../../../../../types/subscription';

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
    <nav
      className="subscription-pagination"
      aria-label={t('subscriptions.pagination.page', {
        current: currentPage,
        total: totalPages,
      })}
    >
      {/* 左侧：总数信息 */}
      <div className="subscription-pagination-total nb-text-secondary">
        {t('subscriptions.pagination.total', { count: totalItems })}
      </div>

      {/* 中间：页码按钮 */}
      <div className="subscription-pagination-pages">
        {/* 上一页 */}
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className={`subscription-pagination-button ${
            currentPage === 1
              ? 'subscription-pagination-button--disabled'
              : 'subscription-pagination-button--idle'
          }`}
          title={t('subscriptions.pagination.prev')}
          aria-label={t('subscriptions.pagination.prev')}
        >
          <span className="material-symbols-outlined text-sm" aria-hidden="true">chevron_left</span>
        </button>

        {/* 页码 */}
        {pageNumbers.map((page, index) => (
          page === 'ellipsis' ? (
            <span key={`ellipsis-${index}`} className="subscription-pagination-ellipsis nb-text-secondary">
              ...
            </span>
          ) : (
            <button
              type="button"
              key={page}
              onClick={() => onPageChange(page)}
              className={`subscription-pagination-button ${
                currentPage === page
                  ? 'subscription-pagination-button--active'
                  : 'subscription-pagination-button--idle'
              }`}
              aria-current={currentPage === page ? 'page' : undefined}
              aria-label={t('subscriptions.pagination.goToPage', { page })}
            >
              {page}
            </button>
          )
        ))}

        {/* 下一页 */}
        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className={`subscription-pagination-button ${
            currentPage === totalPages
              ? 'subscription-pagination-button--disabled'
              : 'subscription-pagination-button--idle'
          }`}
          title={t('subscriptions.pagination.next')}
          aria-label={t('subscriptions.pagination.next')}
        >
          <span className="material-symbols-outlined text-sm" aria-hidden="true">chevron_right</span>
        </button>
      </div>

      {/* 右侧：每页数量选择 */}
      <label className="subscription-pagination-size">
        <span className="text-sm nb-text-secondary">
          {t('subscriptions.pagination.pageSize')}
        </span>
        <select
          value={pageSize}
          onChange={(e) => onPageSizeChange(parsePageSizeOption(e.target.value))}
          className="nb-input subscription-pagination-select"
        >
          {PAGE_SIZE_OPTIONS.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
      </label>
    </nav>
  );
};

export default Pagination;
