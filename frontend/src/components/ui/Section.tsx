import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type SectionProps = {
  id?: string;
  children: ReactNode;
  className?: string;
  tone?: 'canvas' | 'tint' | 'aubergine' | 'coral';
  as?: 'section' | 'div';
  ariaLabel?: string;
};

const toneClass = {
  canvas: 'bg-canvas text-aubergine',
  tint: 'bg-periwinkle-tint/50 text-aubergine',
  aubergine: 'bg-aubergine text-canvas',
  coral: 'bg-coral text-aubergine',
} as const;

/** Consistent vertical rhythm + tonal blocks for section-to-section contrast. */
export function Section({
  id,
  children,
  className,
  tone = 'canvas',
  as = 'section',
  ariaLabel,
}: SectionProps) {
  const Tag = as;
  return (
    <Tag
      id={id}
      aria-label={ariaLabel}
      className={cn(
        // Mobile: tight stack between sections. sm+: restore premium rhythm.
        'py-8 sm:py-14 md:py-20 lg:py-section',
        toneClass[tone],
        className
      )}
    >
      <div className="container-content">{children}</div>
    </Tag>
  );
}
