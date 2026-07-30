import { cn } from '@/lib/utils';

/**
 * Read-only address chip for OTP / reset screens.
 * The email is already known from the previous step — editing it here would
 * silently verify (or reset) the wrong account.
 */
export function LockedEmail({
  email,
  className,
}: {
  email: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-[14px] border border-line bg-coral/10 px-4 py-3.5 sm:rounded-2xl',
        className,
      )}
    >
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-yellow text-aubergine shadow-soft"
        aria-hidden
      >
        <MailIcon />
      </span>
      <span className="min-w-0">
        <span className="block text-[0.7rem] font-semibold uppercase tracking-eyebrow text-deep-coral">
          Code sent to
        </span>
        <span className="mt-0.5 block truncate text-sm font-semibold text-aubergine">{email}</span>
      </span>
    </div>
  );
}

function MailIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3.5" y="5.5" width="17" height="13" rx="2" stroke="currentColor" strokeWidth="1.75" />
      <path d="M4 7l8 6 8-6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
