import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

type FieldShellProps = {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
  className?: string;
};

export function FieldShell({ label, hint, error, children, className }: FieldShellProps) {
  return (
    <label className={cn('block', className)}>
      <span className="mb-1.5 block text-sm font-semibold text-aubergine">{label}</span>
      {children}
      {hint && !error ? <span className="mt-1.5 block text-xs text-ink-55">{hint}</span> : null}
      {error ? <span className="mt-1.5 block text-xs font-medium text-deep-coral">{error}</span> : null}
    </label>
  );
}

const inputClass =
  'w-full rounded-field border border-line bg-canvas px-3.5 py-2.5 text-sm text-aubergine outline-none transition-colors placeholder:text-ink-40 focus:border-line-strong focus:shadow-ring';

export function TextInput({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(inputClass, className)} {...props} />;
}

export function TextTextarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(inputClass, 'min-h-[120px] resize-y', className)} {...props} />;
}

export function TextSelect({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(inputClass, className)} {...props}>
      {children}
    </select>
  );
}

export function FormField(props: FieldShellProps & { inputProps?: InputHTMLAttributes<HTMLInputElement> }) {
  const { inputProps, ...shell } = props;
  return (
    <FieldShell {...shell}>
      <TextInput {...inputProps} />
    </FieldShell>
  );
}
