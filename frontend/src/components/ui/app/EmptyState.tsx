import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Reveal } from '@/components/ui/Reveal';
import { cn } from '@/lib/utils';

type EmptyStateProps = {
  title: string;
  body?: string;
  actionLabel?: string;
  actionTo?: string;
  className?: string;
  children?: ReactNode;
};

export function EmptyState({ title, body, actionLabel, actionTo, className, children }: EmptyStateProps) {
  return (
    <Reveal y={16}>
      <div
        className={cn(
          'rounded-card border border-dashed border-line-strong bg-surface px-6 py-12 text-center sm:px-10',
          className,
        )}
      >
        <h2 className="font-display text-xl font-bold text-aubergine">{title}</h2>
        {body ? <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted">{body}</p> : null}
        {actionLabel && actionTo ? (
          <Link to={actionTo} className="btn-primary mt-6 w-full sm:w-auto">
            {actionLabel}
          </Link>
        ) : null}
        {children}
      </div>
    </Reveal>
  );
}
