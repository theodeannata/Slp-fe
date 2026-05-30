"use client";

import { useState } from "react";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Inbox,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
} from "lucide-react";

interface Column<T> {
  header: string;
  accessor: (item: T) => React.ReactNode;
  sortKey?: keyof T;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  searchPlaceholder?: string;
  searchFilter?: (item: T, query: string) => boolean;
  actions?: (item: T) => React.ReactNode;
  isLoading?: boolean;
}

export function Table<T>({
  columns,
  data,
  searchPlaceholder = "Search...",
  searchFilter,
  actions,
  isLoading = false,
}: TableProps<T>) {
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [sortField, setSortField] = useState<keyof T | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // Handle click on sortable column header
  const handleSort = (key?: keyof T) => {
    if (!key) return;
    if (sortField === key) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(key);
      setSortOrder("desc"); // Default to desc (useful for dates, amounts, and IDs)
    }
    setCurrentPage(1);
  };

  // Filter data
  let processedData = searchFilter
    ? data.filter((item) => searchFilter(item, searchQuery))
    : data;

  // Apply column sorting
  if (sortField) {
    processedData = [...processedData].sort((a, b) => {
      const valA = a[sortField];
      const valB = b[sortField];

      if (valA === valB) return 0;
      if (valA === null || valA === undefined) return 1;
      if (valB === null || valB === undefined) return -1;

      let comparison = 0;
      if (typeof valA === "number" && typeof valB === "number") {
        comparison = valA - valB;
      } else if (
        (typeof valA === "string" && !isNaN(Date.parse(valA))) &&
        (typeof valB === "string" && !isNaN(Date.parse(valB))) &&
        valA.includes("-") && valB.includes("-")
      ) {
        // String dates format: YYYY-MM-DD
        comparison = new Date(valA).getTime() - new Date(valB).getTime();
      } else {
        comparison = String(valA).localeCompare(String(valB), undefined, {
          numeric: true,
          sensitivity: "base",
        });
      }

      return sortOrder === "asc" ? comparison : -comparison;
    });
  }

  // Pagination calculations
  const totalPages = Math.ceil(processedData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = processedData.slice(startIndex, startIndex + itemsPerPage);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // Generate pagination window array (maximum 5 visible pages)
  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      let start = Math.max(1, currentPage - 1);
      let end = Math.min(totalPages, currentPage + 1);

      if (currentPage <= 2) {
        end = 4;
      } else if (currentPage >= totalPages - 1) {
        start = totalPages - 3;
      }

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
    }
    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <div className="space-y-4">
      {/* Search Input */}
      {searchFilter && (
        <div className="relative max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-10 pr-4 py-2 border border-border-custom rounded-xl bg-card-bg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all shadow-sm"
          />
        </div>
      )}

      {/* Table Container */}
      <div className="w-full overflow-hidden border border-border-custom rounded-2xl bg-sidebar-bg shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-max">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-slate-900/20 border-b border-border-custom text-slate-500 text-xs font-semibold uppercase tracking-wider">
                {columns.map((col, index) => {
                  const isSortable = !!col.sortKey;
                  return (
                    <th
                      key={index}
                      className={`px-6 py-4 ${
                        isSortable
                          ? "cursor-pointer select-none hover:bg-slate-100/50 dark:hover:bg-slate-800/30 transition-colors"
                          : ""
                      }`}
                      onClick={() => isSortable && handleSort(col.sortKey)}
                    >
                      <div className="flex items-center gap-1.5">
                        <span>{col.header}</span>
                        {isSortable && (
                          <span className="text-slate-400 shrink-0">
                            {sortField === col.sortKey ? (
                              sortOrder === "asc" ? (
                                <ArrowUp className="w-3 h-3 text-primary" />
                              ) : (
                                <ArrowDown className="w-3 h-3 text-primary" />
                              )
                            ) : (
                              <ArrowUpDown className="w-3 h-3 opacity-40 hover:opacity-100 transition-opacity" />
                            )}
                          </span>
                        )}
                      </div>
                    </th>
                  );
                })}
                {actions && <th className="px-6 py-4 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-border-custom text-sm text-foreground">
              {isLoading ? (
                <tr>
                  <td
                    colSpan={columns.length + (actions ? 1 : 0)}
                    className="px-6 py-12 text-center text-slate-400"
                  >
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      Loading records...
                    </div>
                  </td>
                </tr>
              ) : paginatedData.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length + (actions ? 1 : 0)}
                    className="px-6 py-16 text-center text-slate-400"
                  >
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Inbox className="w-10 h-10 text-slate-300 dark:text-slate-700" />
                      <span className="font-medium text-slate-500">No records found</span>
                      <span className="text-xs text-slate-400">
                        Try modifying your search query or add a new entry.
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedData.map((item, rowIndex) => (
                  <tr
                    key={rowIndex}
                    className="hover:bg-slate-50/30 dark:hover:bg-slate-800/10 transition-colors"
                  >
                    {columns.map((col, colIndex) => (
                      <td key={colIndex} className="px-6 py-4 align-middle">
                        {col.accessor(item)}
                      </td>
                    ))}
                    {actions && (
                      <td className="px-6 py-4 text-right align-middle">
                        <div className="flex items-center justify-end gap-2">
                          {actions(item)}
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {processedData.length > 0 && (
          <div className="px-6 py-4 border-t border-border-custom bg-slate-50/50 dark:bg-slate-900/10 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
              <span>
                Showing{" "}
                <span className="font-semibold text-slate-700 dark:text-slate-200">
                  {startIndex + 1}
                </span>{" "}
                to{" "}
                <span className="font-semibold text-slate-700 dark:text-slate-200">
                  {Math.min(startIndex + itemsPerPage, processedData.length)}
                </span>{" "}
                of{" "}
                <span className="font-semibold text-slate-700 dark:text-slate-200">
                  {processedData.length}
                </span>{" "}
                records
              </span>

              <div className="flex items-center gap-2">
                <span>Rows per page:</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="px-2 py-1 bg-card-bg border border-border-custom rounded-lg text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all cursor-pointer"
                >
                  {[8, 20, 50, 100, 250, 500].map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded-lg border border-border-custom hover:bg-slate-100 dark:hover:bg-slate-850 disabled:opacity-40 disabled:hover:bg-transparent transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                {pageNumbers[0] > 1 && (
                  <>
                    <button
                      onClick={() => handlePageChange(1)}
                      className={`w-8 h-8 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                        currentPage === 1
                          ? "bg-primary text-white"
                          : "border border-border-custom hover:bg-slate-100 dark:hover:bg-slate-850"
                      }`}
                    >
                      1
                    </button>
                    {pageNumbers[0] > 2 && (
                      <span className="px-1.5 text-xs text-slate-400">...</span>
                    )}
                  </>
                )}

                {pageNumbers.map((page) => (
                  <button
                    key={page}
                    onClick={() => handlePageChange(page)}
                    className={`w-8 h-8 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                      currentPage === page
                        ? "bg-primary text-white"
                        : "border border-border-custom hover:bg-slate-100 dark:hover:bg-slate-850"
                    }`}
                  >
                    {page}
                  </button>
                ))}

                {pageNumbers[pageNumbers.length - 1] < totalPages && (
                  <>
                    {pageNumbers[pageNumbers.length - 1] < totalPages - 1 && (
                      <span className="px-1.5 text-xs text-slate-400">...</span>
                    )}
                    <button
                      onClick={() => handlePageChange(totalPages)}
                      className={`w-8 h-8 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                        currentPage === totalPages
                          ? "bg-primary text-white"
                          : "border border-border-custom hover:bg-slate-100 dark:hover:bg-slate-850"
                      }`}
                    >
                      {totalPages}
                    </button>
                  </>
                )}

                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="p-1.5 rounded-lg border border-border-custom hover:bg-slate-100 dark:hover:bg-slate-850 disabled:opacity-40 disabled:hover:bg-transparent transition-colors cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default Table;
