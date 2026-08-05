import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';

type Tone = 'default' | 'success' | 'danger' | 'accent';

const toneClass: Record<Tone, string> = {
  default:
    'border-line text-muted hover:bg-periwinkle-tint/50 hover:text-aubergine',
  success:
    'border-green/40 bg-green/10 text-published-green hover:bg-green/20',
  danger:
    'border-deep-coral/40 bg-coral/10 text-deep-coral hover:bg-coral/20',
  accent:
    'border-aubergine/20 bg-aubergine/5 text-aubergine hover:bg-aubergine/10',
};

type AdminActionButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: Tone;
};

export function AdminActionButton({
  tone = 'default',
  className,
  type = 'button',
  ...props
}: AdminActionButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'rounded-field border px-2.5 py-1 text-[0.7rem] font-semibold transition-colors disabled:opacity-40',
        toneClass[tone],
        className,
      )}
      {...props}
    />
  );
}

export function AdminActionBar({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('flex flex-wrap items-center gap-1.5', className)}>{children}</div>;
}
