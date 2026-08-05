import type { FormEvent, ReactNode } from 'react';
import { cn } from '@/lib/utils';

type AdminToolbarProps = {
  children: ReactNode;
  onSubmit?: (e: FormEvent<HTMLFormElement>) => void;
  className?: string;
};

/** Search + filter row shared across admin list screens. */
export function AdminToolbar({ children, onSubmit, className }: AdminToolbarProps) {
  const body = (
    <div
      className={cn(
        'flex flex-wrap items-end gap-3 rounded-card border border-line bg-surface/80 p-3 shadow-soft backdrop-blur-sm sm:p-4',
        className,
      )}
    >
      {children}
    </div>
  );

  if (!onSubmit) return body;

  return (
    <form
      onSubmit={onSubmit}
      className={cn(
        'flex flex-wrap items-end gap-3 rounded-card border border-line bg-surface/80 p-3 shadow-soft backdrop-blur-sm sm:p-4',
        className,
      )}
    >
      {children}
    </form>
  );
}
