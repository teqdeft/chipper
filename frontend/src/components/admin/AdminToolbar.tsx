import type { FormEvent, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react';
import { TextInput, TextSelect } from '@/components/ui/app/FormField';
import { cn } from '@/lib/utils';

type AdminToolbarProps = {
  children: ReactNode;
  onSubmit?: (e: FormEvent<HTMLFormElement>) => void;
  className?: string;
};

const toolbarClass =
  'flex flex-wrap items-center gap-1.5 rounded-xl border border-line/90 bg-surface px-2.5 py-2 shadow-[0_1px_0_rgba(45,27,54,0.04)] sm:flex-nowrap';

const controlClass = '!py-1.5 !px-2.5 text-[0.8125rem]';

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
};

/** Compact search input with leading icon — matches the Users toolbar. */
export function AdminSearchField({ className, ...props }: AdminSearchFieldProps) {
  return (
    <label className={cn('relative min-w-0 flex-1', className)}>
      <span className="pointer-events-none absolute inset-y-0 left-2.5 flex items-center text-muted">
        <svg viewBox="0 0 16 16" fill="none" aria-hidden className="size-3.5">
          <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.5" />
          <path d="M10.5 10.5 14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </span>
      <TextInput className={cn(controlClass, '!pl-8 !pr-3')} {...props} />
    </label>
  );
}

type AdminFilterSelectProps = SelectHTMLAttributes<HTMLSelectElement>;

/** Compact select sized for toolbar filters. */
export function AdminFilterSelect({ className, children, ...props }: AdminFilterSelectProps) {
  return (
    <TextSelect className={cn('w-[8.5rem] shrink-0', controlClass, className)} {...props}>
      {children}
    </TextSelect>
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
        'shrink-0 rounded-field bg-aubergine px-3 py-1.5 text-[0.75rem] font-semibold text-canvas transition-colors hover:bg-aubergine/90',
        className,
      )}
    >
      {children}
    </button>
  );
}
