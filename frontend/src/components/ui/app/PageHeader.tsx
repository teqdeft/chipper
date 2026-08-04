import type { ReactNode } from 'react';
import { Reveal } from '@/components/ui/Reveal';
import { cn } from '@/lib/utils';

type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  lede?: string;
  actions?: ReactNode;
  className?: string;
};

export function PageHeader({ eyebrow, title, lede, actions, className }: PageHeaderProps) {
  return (
    <div className={cn('flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between', className)}>
      <div className="min-w-0 max-w-2xl">
        {eyebrow ? (
          <Reveal y={12}>
            <p className="eyebrow text-deep-coral">{eyebrow}</p>
          </Reveal>
        ) : null}
        <Reveal delay={eyebrow ? 0.05 : 0} y={18}>
          <h1 className="mt-2 font-display text-display-sm font-extrabold tracking-tight text-aubergine">
            {title}
          </h1>
        </Reveal>
        {lede ? (
          <Reveal delay={0.1} y={16}>
            <p className="mt-3 text-base leading-relaxed text-muted sm:text-[1.05rem]">{lede}</p>
          </Reveal>
        ) : null}
      </div>
      {/* Mobile standard: full width and stacked. A column flex box stretches
          its items, so the buttons fill the row without needing w-full each. */}
      {actions ? (
        <Reveal
          delay={0.12}
          y={14}
          className="flex w-full shrink-0 flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center"
        >
          {actions}
        </Reveal>
      ) : null}
    </div>
  );
}
