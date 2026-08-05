import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type AdminStatCardProps = {
  label: string;
  value: string;
  sub?: string;
  highlight?: boolean;
  action?: ReactNode;
  className?: string;
};

export function AdminStatCard({ label, value, sub, highlight, action, className }: AdminStatCardProps) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-card border bg-surface p-5 shadow-soft',
        highlight ? 'border-coral/40 bg-gradient-to-br from-coral-tint/50 to-surface' : 'border-line',
        className,
      )}
    >
      <p className="truncate text-[0.6rem] font-semibold uppercase tracking-eyebrow text-muted sm:text-[0.65rem]">
        {label}
      </p>
      <p className="mt-1.5 font-display text-xl font-extrabold tabular-nums tracking-tight text-aubergine sm:mt-2 sm:text-2xl lg:text-[1.75rem]">
        {value}
      </p>
      {sub ? <p className="mt-1 text-[0.7rem] leading-snug text-muted sm:text-xs">{sub}</p> : null}
      {action ? <div className="mt-3">{action}</div> : null}
      {highlight ? (
        <span className="absolute right-3 top-3 h-2 w-2 rounded-full bg-coral shadow-[0_0_0_3px_rgba(252,113,71,0.2)]" />
      ) : null}
    </div>
  );
}
