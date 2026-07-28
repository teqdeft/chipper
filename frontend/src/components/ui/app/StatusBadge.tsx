import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

const tones = {
  coral: 'bg-coral/15 text-deep-coral',
  green: 'bg-green/15 text-[#0f7a52]',
  ink: 'bg-line text-ink-70',
  periwinkle: 'bg-periwinkle-tint text-deep-periwinkle',
  yellow: 'bg-yellow/50 text-aubergine',
} as const;

export function StatusBadge({
  children,
  tone = 'ink',
  className,
}: {
  children: ReactNode;
  tone?: keyof typeof tones;
  className?: string;
}) {
  return (
    <span className={cn('inline-flex items-center rounded-field px-2 py-0.5 text-[0.7rem] font-semibold', tones[tone], className)}>
      {children}
    </span>
  );
}
