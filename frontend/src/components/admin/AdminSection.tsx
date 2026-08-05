import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type AdminSectionProps = {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  /** When false, renders children without the bordered panel chrome. */
  panel?: boolean;
};

export function AdminSection({
  title,
  description,
  actions,
  children,
  className,
  panel = true,
}: AdminSectionProps) {
  return (
    <section className={cn('space-y-4', className)}>
      {title || actions ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            {title ? <h2 className="font-display text-lg font-bold text-aubergine">{title}</h2> : null}
            {description ? <p className="mt-1 text-sm text-muted">{description}</p> : null}
          </div>
          {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
        </div>
      ) : null}
      {panel ? (
        <div className="rounded-card border border-line bg-surface p-4 shadow-soft sm:p-5">{children}</div>
      ) : (
        children
      )}
    </section>
  );
}
