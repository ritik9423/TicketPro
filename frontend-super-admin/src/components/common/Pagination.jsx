import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

/**
 * Universal server-side pagination bar.
 *
 * Props:
 * - currentPage: 0-indexed integer
 * - totalPages: total number of pages (integer)
 * - totalElements: total number of records (integer)
 * - pageSize: current page size (default 20, max 100)
 * - onPageChange: callback(newPage: number) -> void
 * - onPageSizeChange: callback(newSize: number) -> void (optional)
 * - sizeOptions: array of allowed sizes (default: [10, 20, 50, 100])
 * - disabled: boolean
 */
const Pagination = ({
  currentPage = 0,
  totalPages = 1,
  totalElements = 0,
  pageSize = 20,
  onPageChange,
  onPageSizeChange,
  sizeOptions = [10, 20, 50, 100],
  disabled = false,
  className = ''
}) => {
  const start = totalElements === 0 ? 0 : currentPage * pageSize + 1;
  const end = Math.min((currentPage + 1) * pageSize, totalElements);

  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    if (totalPages <= maxVisible) {
      for (let i = 0; i < totalPages; i++) pages.push(i);
    } else {
      let startPage = Math.max(0, currentPage - 2);
      let endPage = Math.min(totalPages - 1, startPage + maxVisible - 1);
      if (endPage - startPage < maxVisible - 1) {
        startPage = Math.max(0, endPage - maxVisible + 1);
      }
      for (let i = startPage; i <= endPage; i++) pages.push(i);
    }
    return pages;
  };

  const isFirst = currentPage <= 0;
  const isLast = currentPage >= totalPages - 1 || totalPages === 0;

  return (
    <div
      className={`flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-white border-t border-slate-200/80 rounded-b-2xl select-none ${className}`}
    >
      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 font-medium">
        <span>
          Showing <span className="font-bold text-slate-800">{start}</span> to{' '}
          <span className="font-bold text-slate-800">{end}</span> of{' '}
          <span className="font-bold text-slate-800">{totalElements}</span> entries
        </span>

        {onPageSizeChange && (
          <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200">
            <span className="text-slate-400">Rows:</span>
            <select
              value={pageSize}
              disabled={disabled}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="py-1 px-2 text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg hover:border-slate-300 focus:outline-none focus:ring-1 focus:ring-cyan-500 cursor-pointer disabled:opacity-50"
            >
              {sizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt} / page
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="flex items-center space-x-1 text-xs">
        <button
          type="button"
          onClick={() => onPageChange(0)}
          disabled={disabled || isFirst}
          title="First Page"
          className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-35 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-colors"
        >
          <ChevronsLeft className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={() => onPageChange(Math.max(0, currentPage - 1))}
          disabled={disabled || isFirst}
          title="Previous Page"
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-35 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-colors font-semibold"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Prev</span>
        </button>

        <div className="flex items-center space-x-1">
          {getPageNumbers().map((p) => {
            const isActive = p === currentPage;
            return (
              <button
                key={p}
                type="button"
                onClick={() => onPageChange(p)}
                disabled={disabled}
                className={`min-w-7 h-7 px-2 rounded-lg font-bold text-xs transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-xs shadow-cyan-500/20'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                {p + 1}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => onPageChange(Math.min(totalPages - 1, currentPage + 1))}
          disabled={disabled || isLast}
          title="Next Page"
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-35 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-colors font-semibold"
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={() => onPageChange(Math.max(0, totalPages - 1))}
          disabled={disabled || isLast}
          title="Last Page"
          className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-35 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-colors"
        >
          <ChevronsRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

export default Pagination;
