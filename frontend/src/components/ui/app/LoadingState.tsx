import { cn } from '@/lib/utils';
import { EmptyState } from '@/components/ui/app/EmptyState';
import type { DescribedError } from '@/lib/api/errors';

/** Inline spinner for a section that is still loading. */
export function LoadingState({ label = 'Loading…', className }: { label?: string; className?: string }) {
  return (
    <div
      className={cn('flex min-h-[40vh] flex-col items-center justify-center gap-3', className)}
      role="status"
      aria-live="polite"
    >
      <span className="h-8 w-8 animate-spin rounded-full border-2 border-line border-t-coral" aria-hidden />
      <p className="text-sm text-ink-70">{label}</p>
    </div>
  );
}

/** Content-shaped placeholder — steadier than a spinner for known layouts. */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-field bg-periwinkle-tint/40', className)} aria-hidden />;
}

/**
 * Failure state for a section that could not load.
 * Offers a retry when the failure is plausibly transient (network, 5xx).
 */
export function ErrorState({
  error,
  onRetry,
  className,
}: {
  error: DescribedError;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div className={className}>
      <EmptyState title={error.title} body={error.message}>
        {error.retryable && onRetry ? (
          <button type="button" onClick={onRetry} className="btn-primary mt-6 inline-flex">
            Try again
          </button>
        ) : null}
      </EmptyState>
    </div>
  );
}
