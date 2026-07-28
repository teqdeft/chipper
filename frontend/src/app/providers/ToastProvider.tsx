/**
 * Toast notifications.
 *
 * One channel for transient feedback across the app: a save succeeded, an upload
 * failed, a session expired. Designed to match the Chipper surface — warm canvas,
 * hairline border, coral accent — and to stay out of the way:
 *
 *  - stacked bottom-right on desktop, full-width top on mobile
 *  - auto-dismiss with a progress bar that pauses on hover/focus
 *  - errors persist until dismissed, because they usually need a decision
 *  - `role="alert"` for errors, `role="status"` for the rest, so screen readers
 *    interrupt only when something actually went wrong
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

const DEFAULT_DURATION: Record<ToastTone, number> = {
  success: 4000,
  info: 5000,
  warning: 7000,
  // Errors wait for the reader — they usually carry a next step.
  error: 0,
};

const MAX_VISIBLE = 4;

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
    // Oldest falls off the top so the stack never grows without bound.
    setToasts((current) => [...current, toast].slice(-MAX_VISIBLE));
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

const TONE_STYLE: Record<ToastTone, { bar: string; icon: string; ring: string }> = {
  success: { bar: 'bg-green', icon: 'text-green', ring: 'ring-green/20' },
  error: { bar: 'bg-deep-coral', icon: 'text-deep-coral', ring: 'ring-deep-coral/20' },
  warning: { bar: 'bg-coral', icon: 'text-deep-coral', ring: 'ring-coral/25' },
  info: { bar: 'bg-periwinkle', icon: 'text-aubergine', ring: 'ring-line-strong' },
};

function ToastViewport({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: string) => void }) {
  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[200] flex flex-col gap-2 p-4 sm:inset-x-auto sm:bottom-0 sm:right-0 sm:top-auto sm:max-w-sm sm:p-6"
      aria-live="polite"
    >
      <AnimatePresence initial={false}>
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
  const style = TONE_STYLE[toast.tone];

  // Auto-dismiss, pausing while the pointer or focus is on the card so a toast
  // is never pulled away mid-read.
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
      initial={reduced ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.97 }}
      animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
      exit={reduced ? { opacity: 0 } : { opacity: 0, x: 24, scale: 0.97 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      role={toast.tone === 'error' ? 'alert' : 'status'}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      className={cn(
        'pointer-events-auto relative overflow-hidden rounded-[14px] border border-line bg-canvas shadow-soft ring-1',
        style.ring,
      )}
    >
      <div className="flex items-start gap-3 p-4">
        <span className={cn('mt-0.5 shrink-0', style.icon)} aria-hidden>
          <ToastIcon tone={toast.tone} />
        </span>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-snug text-aubergine">{toast.title}</p>
          {toast.message ? (
            <p className="mt-1 text-sm leading-relaxed text-ink-70">{toast.message}</p>
          ) : null}

          {toast.action ? (
            <div className="mt-2.5">
              {toast.action.to ? (
                <Link
                  to={toast.action.to}
                  onClick={() => onDismiss(toast.id)}
                  className="text-sm font-semibold text-deep-coral hover:underline"
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
                  className="text-sm font-semibold text-deep-coral hover:underline"
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
          className="-mr-1 -mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-btn text-ink-55 transition-colors hover:bg-periwinkle-tint/60 hover:text-aubergine"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
            <path d="m3.5 3.5 7 7m0-7-7 7" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {toast.duration > 0 && !reduced ? (
        <motion.span
          className={cn('absolute bottom-0 left-0 h-0.5', style.bar)}
          initial={{ width: '100%' }}
          animate={{ width: paused ? undefined : '0%' }}
          transition={{ duration: toast.duration / 1000, ease: 'linear' }}
          aria-hidden
        />
      ) : null}
    </motion.div>
  );
}

function ToastIcon({ tone }: { tone: ToastTone }) {
  if (tone === 'success') {
    return (
      <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden>
        <circle cx="10" cy="10" r="8.25" stroke="currentColor" strokeWidth="1.6" />
        <path d="m6.5 10.2 2.4 2.3 4.6-4.8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (tone === 'info') {
    return (
      <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden>
        <circle cx="10" cy="10" r="8.25" stroke="currentColor" strokeWidth="1.6" />
        <path d="M10 9v4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <circle cx="10" cy="6.4" r="1" fill="currentColor" />
      </svg>
    );
  }
  // error + warning share the alert triangle.
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden>
      <path
        d="M10 2.75 18 16.5H2L10 2.75Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M10 8v3.4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="10" cy="13.9" r="1" fill="currentColor" />
    </svg>
  );
}
