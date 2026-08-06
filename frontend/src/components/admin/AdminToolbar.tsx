import type { FormEvent, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

type AdminToolbarProps = {
  children: ReactNode;
  onSubmit?: (e: FormEvent<HTMLFormElement>) => void;
  className?: string;
};

/** Compact control chrome — kept local so it never fights TextInput's `w-full`. */
const controlClass =
  'rounded-field border border-line-strong bg-canvas text-[0.8125rem] leading-5 text-aubergine outline-none transition-colors placeholder:text-muted focus:shadow-ring';

const toolbarClass =
  'flex w-full min-w-0 flex-wrap items-center gap-2 rounded-xl border border-line bg-surface px-2.5 py-2';

/** Search + filter row shared across admin list screens. */
export function AdminToolbar({ children, onSubmit, className }: AdminToolbarProps) {
  if (!onSubmit) {
    return <div className={cn(toolbarClass, className)}>{children}</div>;
  }

  return (
    <form onSubmit={onSubmit} className={cn(toolbarClass, className)}>
      {children}
    </form>
  );
}

type AdminSearchFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'className'> & {
  className?: string;
  /** Clears the field immediately — shown as an × when the input has text. */
  onClear?: () => void;
};

/** Compact search input with leading icon and optional clear control. */
export function AdminSearchField({ className, onClear, value, ...props }: AdminSearchFieldProps) {
  const hasValue = String(value ?? '').length > 0;

  return (
    <label className={cn('relative min-w-[12rem] flex-1 basis-[14rem]', className)}>
      <span className="pointer-events-none absolute inset-y-0 left-2.5 flex items-center text-muted">
        <svg viewBox="0 0 16 16" fill="none" aria-hidden className="size-3.5">
          <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.5" />
          <path d="M10.5 10.5 14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </span>
      <input
        className={cn(controlClass, 'h-9 w-full min-w-0 py-0 pl-8', hasValue && onClear ? 'pr-8' : 'pr-3')}
        value={value}
        {...props}
      />
      {hasValue && onClear ? (
        <button
          type="button"
          onClick={onClear}
          className="absolute inset-y-0 right-1.5 flex items-center px-1.5 text-muted transition-colors hover:text-aubergine"
          aria-label="Clear search"
        >
          <svg viewBox="0 0 16 16" fill="none" aria-hidden className="size-3.5">
            <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      ) : null}
    </label>
  );
}

type AdminFilterSelectProps = SelectHTMLAttributes<HTMLSelectElement>;

/** Compact select sized for toolbar filters. */
export function AdminFilterSelect({ className, children, ...props }: AdminFilterSelectProps) {
  return (
    <select
      className={cn(
        controlClass,
        'h-9 w-auto min-w-[8.75rem] max-w-[16rem] shrink-0 px-2.5 py-0',
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}

type AdminToolbarButtonProps = {
  children: ReactNode;
  type?: 'submit' | 'button';
  className?: string;
  onClick?: () => void;
};

/** Compact aubergine CTA used inside admin toolbars. */
export function AdminToolbarButton({
  children,
  type = 'submit',
  className,
  onClick,
}: AdminToolbarButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      className={cn(
        'inline-flex h-9 shrink-0 items-center justify-center rounded-field bg-aubergine px-3.5 text-[0.75rem] font-semibold text-canvas transition-colors hover:bg-aubergine/90',
        className,
      )}
    >
      {children}
    </button>
  );
}
