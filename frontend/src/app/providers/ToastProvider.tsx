/**
 * Toast notifications.
 *
 * Transient feedback for sign-in, sign-up, logout, saves, and failures.
 * Dark aubergine glass against the warm canvas — high contrast, quiet chrome —
 * so the notice feels carved from the brand rather than bolted on.
 *
 *  - top-right, below the nav
 *  - auto-dismiss with a hairline progress track (pauses on hover/focus)
 *  - errors persist until dismissed
 *  - `role="alert"` for errors, `role="status"` otherwise
 *  - respects prefers-reduced-motion
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { describeError } from '@/lib/api/errors';
import { cn } from '@/lib/utils';

export type ToastTone = 'success' | 'error' | 'warning' | 'info';

export type Toast = {
  id: string;
  tone: ToastTone;
  title: string;
  message?: string;
  /** Milliseconds; 0 keeps it until dismissed. Errors default to 0. */
  duration: number;
  action?: { label: string; to?: string; onClick?: () => void };
};

type ToastInput = Omit<Partial<Toast>, 'id'> & { title: string };

type ToastContextValue = {
  toasts: Toast[];
  show: (toast: ToastInput) => string;
  success: (title: string, message?: string) => string;
  error: (title: string, message?: string) => string;
  warning: (title: string, message?: string) => string;
  info: (title: string, message?: string) => string;
  /** Renders any thrown API error with its friendly title, tone and action. */
  fromError: (error: unknown) => string;
  dismiss: (id: string) => void;
  clear: () => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

/**
 * Auto-dismiss defaults per tone. Errors linger longest but do dismiss — a
 * stale "No connection" sitting there after the network recovers is worse than
 * the risk of missing it, and the timer pauses on hover for readers. A toast
 * that truly must persist passes `duration: 0` explicitly.
 */
const DEFAULT_DURATION: Record<ToastTone, number> = {
  success: 3000,
  info: 3500,
  warning: 4500,
  error: 5000,
};

const MAX_VISIBLE = 3;

let counter = 0;
const nextId = () => `toast-${++counter}`;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const show = useCallback((input: ToastInput) => {
    const tone = input.tone ?? 'info';
    const toast: Toast = {
      id: nextId(),
      tone,
      title: input.title,
      message: input.message,
      duration: input.duration ?? DEFAULT_DURATION[tone],
      action: input.action,
    };

    setToasts((current) => {
      const duplicate = current.find(
        (t) => t.tone === toast.tone && t.title === toast.title && t.message === toast.message,
      );
      if (duplicate) return current;
      return [...current, toast].slice(-MAX_VISIBLE);
    });

    return toast.id;
  }, []);

  const value = useMemo<ToastContextValue>(() => {
    const shorthand = (tone: ToastTone) => (title: string, message?: string) => show({ tone, title, message });

    return {
      toasts,
      show,
      dismiss,
      success: shorthand('success'),
      error: shorthand('error'),
      warning: shorthand('warning'),
      info: shorthand('info'),
      fromError: (error: unknown) => {
        const described = describeError(error);
        return show({
          tone: described.tone,
          title: described.title,
          message: described.message,
          action: described.action ? { label: described.action.label, to: described.action.to } : undefined,
        });
      },
      clear: () => setToasts([]),
    };
  }, [toasts, show, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used inside <ToastProvider>');
  return context;
}

// ── Presentation ───────────────────────────────────────────────────────────

const TONE_ACCENT: Record<ToastTone, string> = {
  success: 'text-green',
  error: 'text-coral',
  warning: 'text-yellow',
  info: 'text-periwinkle',
};

const ease = [0.22, 1, 0.36, 1] as const;

function ToastViewport({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: string) => void }) {
  return (
    <div
      className="pointer-events-none fixed right-0 top-0 z-[200] flex w-full max-w-[420px] flex-col items-end gap-3 px-4 pb-4 pt-[4.75rem] sm:px-6 sm:pt-[5.25rem]"
      aria-live="polite"
    >
      <AnimatePresence initial={false} mode="popLayout">
        {toasts.map((toast) => (
          <ToastCard key={toast.id} toast={toast} onDismiss={onDismiss} />
        ))}
      </AnimatePresence>
    </div>
  );
}

function ToastCard({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  const reduced = useReducedMotion();
  const [paused, setPaused] = useState(false);
  const remaining = useRef(toast.duration);
  const startedAt = useRef(Date.now());
  const accent = TONE_ACCENT[toast.tone];

  useEffect(() => {
    if (!toast.duration || paused) return;
    startedAt.current = Date.now();
    const timer = setTimeout(() => onDismiss(toast.id), remaining.current);
    return () => {
      clearTimeout(timer);
      remaining.current = Math.max(remaining.current - (Date.now() - startedAt.current), 0);
    };
  }, [toast.id, toast.duration, paused, onDismiss]);

  return (
    <motion.div
      layout={!reduced}
      initial={
        reduced
          ? { opacity: 0 }
          : { opacity: 0, x: 18, filter: 'blur(6px)' }
      }
      animate={
        reduced
          ? { opacity: 1 }
          : { opacity: 1, x: 0, filter: 'blur(0px)' }
      }
      exit={
        reduced
          ? { opacity: 0 }
          : { opacity: 0, x: 14, filter: 'blur(4px)', transition: { duration: 0.22 } }
      }
      transition={{ duration: 0.45, ease }}
      role={toast.tone === 'error' ? 'alert' : 'status'}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      className="pointer-events-auto relative w-full max-w-[380px] overflow-hidden rounded-[14px]"
      style={{
        background:
          'linear-gradient(165deg, rgba(69, 8, 31, 0.97) 0%, rgba(52, 6, 24, 0.98) 100%)',
        boxShadow:
          '0 0 0 1px rgba(255, 252, 249, 0.08), 0 1px 1px rgba(69, 8, 31, 0.2), 0 18px 40px -12px rgba(69, 8, 31, 0.55), 0 8px 16px -8px rgba(69, 8, 31, 0.35)',
      }}
    >
      {/* Specular rim — thin light catch along the top edge */}
      <span
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{
          background:
            'linear-gradient(90deg, transparent 8%, rgba(255,252,249,0.28) 40%, rgba(255,187,214,0.22) 55%, transparent 92%)',
        }}
        aria-hidden
      />

      <div className="relative flex items-start gap-3.5 px-4 py-2.5 sm:px-[1.125rem] sm:py-3">
        <span
          className={cn(
            'mt-px flex h-[1.375rem] w-[1.375rem] shrink-0 items-center justify-center',
            accent,
          )}
          aria-hidden
        >
          <ToastIcon tone={toast.tone} />
        </span>

        <div className="min-w-0 flex-1">
          <p className="text-[0.9375rem] font-semibold leading-snug tracking-[-0.01em] text-canvas">
            {toast.title}
          </p>
          {toast.message ? (
            <p className="mt-0.5 text-[0.8125rem] leading-snug text-canvas/65">{toast.message}</p>
          ) : null}

          {toast.action ? (
            <div className="mt-1.5">
              {toast.action.to ? (
                <Link
                  to={toast.action.to}
                  onClick={() => onDismiss(toast.id)}
                  className="text-[0.8125rem] font-semibold text-pink transition-colors hover:text-canvas"
                >
                  {toast.action.label} →
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    toast.action?.onClick?.();
                    onDismiss(toast.id);
                  }}
                  className="text-[0.8125rem] font-semibold text-pink transition-colors hover:text-canvas"
                >
                  {toast.action.label}
                </button>
              )}
            </div>
          ) : null}
        </div>

        <button
          type="button"
          onClick={() => onDismiss(toast.id)}
          aria-label="Dismiss notification"
          className="-mr-1 -mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-canvas/40 transition-colors hover:bg-canvas/[0.08] hover:text-canvas/85"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
            <path d="m2.5 2.5 7 7m0-7-7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {toast.duration > 0 && !reduced ? (
        <div className="relative h-px w-full overflow-hidden bg-canvas/[0.08]" aria-hidden>
          <motion.span
            className="absolute inset-y-0 left-0 w-full origin-left"
            style={{
              background:
                'linear-gradient(90deg, rgba(255,187,214,0.15), rgba(255,252,249,0.55) 45%, rgba(255,252,249,0.25))',
            }}
            initial={{ scaleX: 1 }}
            animate={{ scaleX: paused ? undefined : 0 }}
            transition={{ duration: toast.duration / 1000, ease: 'linear' }}
          />
        </div>
      ) : null}
    </motion.div>
  );
}

function ToastIcon({ tone }: { tone: ToastTone }) {
  if (tone === 'success') {
    return (
      <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden>
        <circle cx="10" cy="10" r="7.5" stroke="currentColor" strokeWidth="1.4" opacity="0.35" />
        <path
          d="m6.6 10.2 2.3 2.2 4.5-4.7"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (tone === 'info') {
    return (
      <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden>
        <circle cx="10" cy="10" r="7.5" stroke="currentColor" strokeWidth="1.4" opacity="0.35" />
        <path d="M10 9.1v4.2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        <circle cx="10" cy="6.6" r="0.95" fill="currentColor" />
      </svg>
    );
  }
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden>
      <circle cx="10" cy="10" r="7.5" stroke="currentColor" strokeWidth="1.4" opacity="0.35" />
      <path d="M10 6.6v4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <circle cx="10" cy="13.3" r="0.95" fill="currentColor" />
    </svg>
  );
}
