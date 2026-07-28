import { cn } from '@/lib/utils';
import type { ApiPagination } from '@/lib/api/client';

/**
 * Pager for API-driven tables and lists.
 * Renders nothing for a single page, so callers can drop it in unconditionally.
 */
export function Pagination({
  pagination,
  onPage,
  className,
}: {
  pagination: ApiPagination | undefined;
  onPage: (page: number) => void;
  className?: string;
}) {
  if (!pagination || pagination.totalPages <= 1) return null;

  const { page, totalPages, totalItems } = pagination;

  return (
    <nav
      className={cn('flex flex-wrap items-center justify-between gap-3', className)}
      aria-label="Pagination"
    >
      <p className="text-xs text-ink-55">
        Page {page} of {totalPages} · {totalItems.toLocaleString()} total
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={!pagination.hasPreviousPage}
          onClick={() => onPage(page - 1)}
          className="rounded-field border border-line px-3 py-1.5 text-xs font-semibold text-ink-70 transition-colors hover:bg-periwinkle-tint/50 disabled:opacity-40"
        >
          ← Previous
        </button>
        <button
          type="button"
          disabled={!pagination.hasNextPage}
          onClick={() => onPage(page + 1)}
          className="rounded-field border border-line px-3 py-1.5 text-xs font-semibold text-ink-70 transition-colors hover:bg-periwinkle-tint/50 disabled:opacity-40"
        >
          Next →
        </button>
      </div>
    </nav>
  );
}
