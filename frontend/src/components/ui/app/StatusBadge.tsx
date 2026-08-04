import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

const tones = {
  coral: 'bg-coral/15 text-deep-coral',
  green: 'bg-green/15 text-published-green',
  ink: 'bg-line text-muted',
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
    // `align-middle` matters whenever a badge sits inline with running text: an
    // inline-flex takes its baseline from its first flex item, so the box's
    // bottom edge lands on the text baseline and the badge hangs low. Centring
    // it on the parent's midline is ignored when the badge is a flex item, so
    // this is safe in every layout it is used in.
    <span
      className={cn(
        'inline-flex items-center rounded-field px-2 py-0.5 align-middle text-[0.7rem] font-semibold',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
