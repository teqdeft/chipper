import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';

export type AlertTone = 'error' | 'warning' | 'success' | 'info';

type FormAlertProps = {
  tone?: AlertTone;
  title?: string;
  message: ReactNode;
  /** Field-level errors listed under the message, e.g. from a 422. */
  details?: Record<string, string> | string[];
  onDismiss?: () => void;
  className?: string;
};

const TONE = {
  error: {
    surface: 'border-deep-coral/25 bg-deep-coral/[0.06]',
    icon: 'text-deep-coral',
    heading: 'text-deep-coral',
  },
  warning: {
    surface: 'border-coral/30 bg-coral/[0.09]',
    icon: 'text-deep-coral',
    heading: 'text-aubergine',
  },
  success: {
    surface: 'border-green/30 bg-green/[0.08]',
    icon: 'text-green',
    heading: 'text-aubergine',
  },
  info: {
    surface: 'border-line-strong bg-periwinkle-tint/30',
    icon: 'text-aubergine',
    heading: 'text-aubergine',
  },
} as const;

/**
 * Inline, form-level feedback.
 *
 * Sits above the fields it explains, animates in so it is noticed without a
 * layout jump, and announces itself assertively only when it is an error.
 */
export function FormAlert({ tone = 'error', title, message, details, onDismiss, className }: FormAlertProps) {
  const reduced = useReducedMotion();
  const style = TONE[tone];

  const detailItems = Array.isArray(details)
    ? details
    : details
      ? Object.entries(details).map(([, value]) => value)
      : [];

  return (
    <motion.div
      initial={reduced ? { opacity: 0 } : { opacity: 0, y: -6, height: 0 }}
      animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0, height: 'auto' }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      role={tone === 'error' ? 'alert' : 'status'}
      aria-live={tone === 'error' ? 'assertive' : 'polite'}
      className={cn('overflow-hidden rounded-field border', style.surface, className)}
    >
      <div className="flex items-start gap-3 px-4 py-3">
        <span className={cn('mt-0.5 shrink-0', style.icon)} aria-hidden>
          <AlertIcon tone={tone} />
        </span>

        <div className="min-w-0 flex-1 text-sm leading-relaxed">
          {title ? <p className={cn('font-semibold', style.heading)}>{title}</p> : null}
          <div className={cn('text-muted', title && 'mt-0.5')}>{message}</div>

          {detailItems.length > 1 ? (
            <ul className="mt-2 list-disc space-y-0.5 pl-4 text-muted">
              {detailItems.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          ) : null}
        </div>

        {onDismiss ? (
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss"
            className="-mr-1 -mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-btn text-muted transition-colors hover:bg-canvas hover:text-aubergine"
          >
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden>
              <path d="m3.5 3.5 7 7m0-7-7 7" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
            </svg>
          </button>
        ) : null}
      </div>
    </motion.div>
  );
}

function AlertIcon({ tone }: { tone: AlertTone }) {
  if (tone === 'success') {
    return (
      <svg width="17" height="17" viewBox="0 0 20 20" fill="none" aria-hidden>
        <circle cx="10" cy="10" r="8.25" stroke="currentColor" strokeWidth="1.6" />
        <path d="m6.5 10.2 2.4 2.3 4.6-4.8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (tone === 'info') {
    return (
      <svg width="17" height="17" viewBox="0 0 20 20" fill="none" aria-hidden>
        <circle cx="10" cy="10" r="8.25" stroke="currentColor" strokeWidth="1.6" />
        <path d="M10 9v4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <circle cx="10" cy="6.4" r="1" fill="currentColor" />
      </svg>
    );
  }
  return (
    <svg width="17" height="17" viewBox="0 0 20 20" fill="none" aria-hidden>
      <path d="M10 2.75 18 16.5H2L10 2.75Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M10 8v3.4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="10" cy="13.9" r="1" fill="currentColor" />
    </svg>
  );
}

/**
 * Submit button with an inline spinner.
 * Keeps its width while loading so the form does not jump.
 */
export function SubmitButton({
  isLoading,
  loadingLabel,
  children,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { isLoading?: boolean; loadingLabel?: string }) {
  return (
    <button
      type="submit"
      aria-busy={isLoading}
      disabled={isLoading || props.disabled}
      className={cn(
        'btn-primary w-full justify-center transition-opacity disabled:cursor-not-allowed disabled:opacity-55',
        className,
      )}
      {...props}
    >
      {isLoading ? (
        <span className="inline-flex items-center gap-2">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden />
          {loadingLabel ?? 'Working…'}
        </span>
      ) : (
        children
      )}
    </button>
  );
}
