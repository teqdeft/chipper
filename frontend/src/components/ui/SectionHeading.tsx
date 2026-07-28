import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Reveal } from './Reveal';

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cn('eyebrow inline-flex items-center gap-2 text-deep-coral', className)}>
      <span className="inline-block h-1.5 w-1.5 rounded-full bg-coral" aria-hidden />
      {children}
    </span>
  );
}

type SectionHeadingProps = {
  eyebrow?: string;
  title: ReactNode;
  lede?: string;
  align?: 'left' | 'center';
  className?: string;
  titleClassName?: string;
};

export function SectionHeading({
  eyebrow,
  title,
  lede,
  align = 'left',
  className,
  titleClassName,
}: SectionHeadingProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-3 sm:gap-5',
        align === 'center' && 'items-center text-center',
        className
      )}
    >
      {eyebrow && (
        <Reveal>
          <Eyebrow>{eyebrow}</Eyebrow>
        </Reveal>
      )}
      <Reveal delay={0.05}>
        <h2
          className={cn(
            'text-display-md font-extrabold text-aubergine',
            align === 'center' && 'max-w-3xl',
            titleClassName
          )}
        >
          {title}
        </h2>
      </Reveal>
      {lede && (
        <Reveal delay={0.1}>
          <p
            className={cn(
              'max-w-prose text-base leading-relaxed text-ink-70 sm:text-lg md:text-xl',
              align === 'center' && 'mx-auto'
            )}
          >
            {lede}
          </p>
        </Reveal>
      )}
    </div>
  );
}
