import { useId, useMemo, useState } from 'react';
import type { InputHTMLAttributes } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';

/**
 * Password field with a reveal toggle.
 *
 * Three things beyond a plain input, each earning its place:
 *  - **Reveal toggle** — typing a password blind is the main cause of mistyped
 *    sign-ins. The button is a real `<button>` with `aria-pressed`, sits outside
 *    the tab order of the value itself, and never submits the form.
 *  - **Caps Lock warning** — the second cause. Detected from the keyboard event,
 *    so it needs no permissions and disappears the moment it stops being true.
 *  - **Live requirements** (opt-in) — mirrors the API's password policy, so a
 *    weak password is caught before the round trip rather than as a 422.
 */

type PasswordInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  /** Show the policy checklist — for new passwords, not for signing in. */
  showRequirements?: boolean;
};

/** Mirrors utils/password.js on the backend. Keep the two in step. */
const REQUIREMENTS = [
  { label: 'At least 8 characters', test: (v: string) => v.length >= 8 },
  { label: 'A lowercase letter', test: (v: string) => /[a-z]/.test(v) },
  { label: 'An uppercase letter', test: (v: string) => /[A-Z]/.test(v) },
  { label: 'A number', test: (v: string) => /\d/.test(v) },
];

export function PasswordInput({ showRequirements, className, value, ...props }: PasswordInputProps) {
  const [revealed, setRevealed] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const reduced = useReducedMotion();
  const hintId = useId();

  const text = typeof value === 'string' ? value : '';
  const met = useMemo(() => REQUIREMENTS.map((r) => r.test(text)), [text]);
  const satisfied = met.filter(Boolean).length;

  const detectCapsLock = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // getModifierState is unavailable on some synthetic events — guard it.
    if (typeof e.getModifierState === 'function') setCapsLock(e.getModifierState('CapsLock'));
  };

  return (
    <div>
      <div className="relative">
        <input
          {...props}
          value={value}
          type={revealed ? 'text' : 'password'}
          aria-describedby={showRequirements ? hintId : props['aria-describedby']}
          onKeyDown={(e) => {
            detectCapsLock(e);
            props.onKeyDown?.(e);
          }}
          onKeyUp={detectCapsLock}
          onBlur={(e) => {
            setCapsLock(false);
            props.onBlur?.(e);
          }}
          className={cn(
            'w-full rounded-field border border-line bg-canvas py-2.5 pl-3.5 pr-11 text-sm text-aubergine outline-none transition-colors placeholder:text-ink-40 focus:border-line-strong focus:shadow-ring',
            className,
          )}
        />

        <button
          type="button"
          onClick={() => setRevealed((v) => !v)}
          aria-label={revealed ? 'Hide password' : 'Show password'}
          aria-pressed={revealed}
          title={revealed ? 'Hide password' : 'Show password'}
          className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-btn text-ink-55 transition-colors hover:bg-periwinkle-tint/60 hover:text-aubergine focus-visible:shadow-ring focus-visible:outline-none"
        >
          <EyeIcon open={revealed} />
        </button>
      </div>

      <AnimatePresence>
        {capsLock ? (
          <motion.p
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: -4 }}
            animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-deep-coral"
            role="status"
          >
            <svg width="12" height="12" viewBox="0 0 20 20" fill="none" aria-hidden>
              <path d="M10 3 3 10h4v4h6v-4h4L10 3Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
            </svg>
            Caps Lock is on
          </motion.p>
        ) : null}
      </AnimatePresence>

      {showRequirements ? (
        <div id={hintId} className="mt-2.5">
          <div className="flex gap-1" aria-hidden>
            {REQUIREMENTS.map((_, index) => (
              <span
                key={index}
                className={cn(
                  'h-1 flex-1 rounded-full transition-colors duration-300',
                  index < satisfied
                    ? satisfied === REQUIREMENTS.length
                      ? 'bg-green'
                      : 'bg-coral'
                    : 'bg-line',
                )}
              />
            ))}
          </div>

          <ul className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1">
            {REQUIREMENTS.map((requirement, index) => (
              <li
                key={requirement.label}
                className={cn(
                  'flex items-center gap-1.5 text-xs transition-colors',
                  met[index] ? 'text-green' : 'text-ink-55',
                )}
              >
                <span className="shrink-0" aria-hidden>
                  {met[index] ? (
                    <svg width="12" height="12" viewBox="0 0 20 20" fill="none">
                      <path
                        d="m4.5 10.4 3.2 3.1 7.8-8"
                        stroke="currentColor"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  ) : (
                    <svg width="12" height="12" viewBox="0 0 20 20" fill="none">
                      <circle cx="10" cy="10" r="3" fill="currentColor" opacity="0.45" />
                    </svg>
                  )}
                </span>
                {requirement.label}
              </li>
            ))}
          </ul>
          <span className="sr-only" aria-live="polite">
            {satisfied} of {REQUIREMENTS.length} password requirements met
          </span>
        </div>
      ) : null}
    </div>
  );
}

/** Eye / eye-with-slash. The slash animates in so the state change reads clearly. */
function EyeIcon({ open }: { open: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden>
      <path
        d="M1.9 10S4.9 4.6 10 4.6 18.1 10 18.1 10 15.1 15.4 10 15.4 1.9 10 1.9 10Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <circle cx="10" cy="10" r="2.4" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M3.4 16.6 16.6 3.4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        style={{
          // Draws itself on, rather than popping in.
          strokeDasharray: 20,
          strokeDashoffset: open ? 0 : 20,
          transition: 'stroke-dashoffset 220ms cubic-bezier(0.22, 1, 0.36, 1)',
        }}
      />
    </svg>
  );
}
