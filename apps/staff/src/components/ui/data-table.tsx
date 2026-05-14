"use client";

import { Skeleton } from "@grwfit/ui";
import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import { cn } from "@grwfit/ui";
import { EmptyState } from "./empty-state";
import type { LucideIcon } from "lucide-react";

export interface ColumnDef<T> {
  key: string;
  header: string;
  sortable?: boolean;
  className?: string;
  render: (row: T) => React.ReactNode;
}

interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface DataTableProps<T> {
  columns: ColumnDef<T>[];
  data: T[];
  isLoading?: boolean;
  error?: string | null;
  meta?: PaginationMeta;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  onSort?: (key: string) => void;
  onPageChange?: (page: number) => void;
  emptyIcon?: LucideIcon;
  emptyTitle?: string;
  emptyDescription?: string;
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
}

export function DataTable<T>({
  columns,
  data,
  isLoading,
  error,
  meta,
  sortBy,
  sortOrder,
  onSort,
  onPageChange,
  emptyIcon,
  emptyTitle = "No data found",
  emptyDescription,
  rowKey,
  onRowClick,
}: DataTableProps<T>) {
  if (error) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-center text-sm text-destructive">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="rounded-lg border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b">
              <tr>
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className={cn(
                      "px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap",
                      col.sortable && "cursor-pointer select-none hover:text-foreground",
                      col.className,
                    )}
                    onClick={() => col.sortable && onSort?.(col.key)}
                  >
                    <div className="flex items-center gap-1">
                      {col.header}
                      {col.sortable && (
                        <span className="ml-1">
                          {sortBy === col.key ? (
                            sortOrder === "asc" ? (
                              <ChevronUp className="h-3.5 w-3.5" />
                            ) : (
                              <ChevronDown className="h-3.5 w-3.5" />
                            )
                          ) : (
                            <ChevronsUpDown className="h-3.5 w-3.5 opacity-40" />
                          )}
                        </span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading
                ? Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i} className="bg-background">
                      {columns.map((col) => (
                        <td key={col.key} className="px-4 py-3">
                          <Skeleton className="h-4 w-full max-w-[120px]" />
                        </td>
                      ))}
                    </tr>
                  ))
                : data.map((row) => (
                    <tr
                      key={rowKey(row)}
                      className={cn(
                        "bg-background transition-colors",
                        onRowClick && "cursor-pointer hover:bg-muted/40",
                      )}
                      onClick={() => onRowClick?.(row)}
                    >
                      {columns.map((col) => (
                        <td key={col.key} className={cn("px-4 py-3", col.className)}>
                          {col.render(row)}
                        </td>
                      ))}
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>

        {!isLoading && data.length === 0 && (
          <EmptyState
            icon={emptyIcon}
            title={emptyTitle}
            description={emptyDescription}
            className="py-12"
          />
        )}
      </div>

      {meta && meta.totalPages > 1 && (
        <TablePagination meta={meta} onPageChange={onPageChange} />
      )}
    </div>
  );
}

function TablePagination({
  meta,
  onPageChange,
}: {
  meta: PaginationMeta;
  onPageChange?: (page: number) => void;
}) {
  const { page, totalPages, total, limit } = meta;
  const start = (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);

  return (
    <div className="flex items-center justify-between px-1 text-sm text-muted-foreground">
      <span>
        {start}–{end} of {total}
      </span>
      <div className="flex gap-1">
        <PageButton onClick={() => onPageChange?.(1)} disabled={page === 1} label="«" />
        <PageButton onClick={() => onPageChange?.(page - 1)} disabled={page === 1} label="‹" />
        <span className="px-3 py-1 font-medium text-foreground">
          {page} / {totalPages}
        </span>
        <PageButton
          onClick={() => onPageChange?.(page + 1)}
          disabled={page === totalPages}
          label="›"
        />
        <PageButton
          onClick={() => onPageChange?.(totalPages)}
          disabled={page === totalPages}
          label="»"
        />
      </div>
    </div>
  );
}

function PageButton({
  onClick,
  disabled,
  label,
}: {
  onClick: () => void;
  disabled: boolean;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="rounded px-2 py-1 hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed"
    >
      {label}
    </button>
  );
}
