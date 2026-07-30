import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

type OtpInputProps = {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  disabled?: boolean;
  autoFocus?: boolean;
  /** Fired once the last digit is entered — lets the form submit itself. */
  onComplete?: (value: string) => void;
  className?: string;
};

/**
 * Segmented one-time-code field.
 *
 * One box per digit, but a single logical value: paste, arrow keys, backspace
 * and the browser's SMS/email autofill (`autocomplete="one-time-code"`) all
 * behave the way people expect.
 */
export function OtpInput({
  value,
  onChange,
  length = 6,
  disabled,
  autoFocus,
  onComplete,
  className,
}: OtpInputProps) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const digits = value.padEnd(length, ' ').slice(0, length).split('');

  useEffect(() => {
    if (autoFocus) refs.current[0]?.focus();
  }, [autoFocus]);

  function commit(next: string) {
    const clean = next.replace(/\D/g, '').slice(0, length);
    onChange(clean);
    if (clean.length === length) onComplete?.(clean);
    return clean;
  }

  function handleChange(index: number, raw: string) {
    const typed = raw.replace(/\D/g, '');
    if (!typed) return;

    // A paste into any box fills from that box onwards.
    const chars = value.split('');
    typed.split('').forEach((char, offset) => {
      if (index + offset < length) chars[index + offset] = char;
    });

    const next = commit(chars.join('').slice(0, length));
    const focusAt = Math.min(index + typed.length, length - 1);
    if (next.length < length) refs.current[focusAt]?.focus();
  }

  function handleKeyDown(index: number, event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Backspace') {
      event.preventDefault();
      const chars = value.padEnd(length, ' ').split('');
      if (chars[index]?.trim()) {
        chars[index] = ' ';
        commit(chars.join('').replace(/ /g, ''));
      } else if (index > 0) {
        chars[index - 1] = ' ';
        commit(chars.join('').replace(/ /g, ''));
        refs.current[index - 1]?.focus();
      }
      return;
    }
    if (event.key === 'ArrowLeft' && index > 0) refs.current[index - 1]?.focus();
    if (event.key === 'ArrowRight' && index < length - 1) refs.current[index + 1]?.focus();
  }

  return (
    <div className={cn('flex gap-2 sm:gap-3', className)} role="group" aria-label={`${length}-digit code`}>
      {Array.from({ length }).map((_, index) => (
        <input
          key={index}
          ref={(el) => {
            refs.current[index] = el;
          }}
          type="text"
          inputMode="numeric"
          autoComplete={index === 0 ? 'one-time-code' : 'off'}
          maxLength={length}
          disabled={disabled}
          aria-label={`Digit ${index + 1}`}
          value={digits[index]?.trim() ?? ''}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onFocus={(e) => e.target.select()}
          className="h-12 w-full min-w-0 rounded-[12px] border border-line bg-canvas text-center font-display text-lg font-bold text-aubergine outline-none transition-[border-color,box-shadow,background-color] placeholder:text-ink-40 focus:border-line-strong focus:bg-coral/10 focus:shadow-ring disabled:opacity-60 sm:h-14 sm:rounded-field sm:text-xl"
        />
      ))}
    </div>
  );
}
