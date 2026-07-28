/**
 * Turns an API failure into something a person can act on.
 *
 * The backend already returns readable messages, but a few codes deserve a
 * clearer framing, a recovery action, or a softer tone than a raw 4xx. Anything
 * not listed here falls through to the server's own message, so a new backend
 * error is never swallowed — it just arrives unstyled.
 */
import { ApiError } from './client';

export type ErrorTone = 'error' | 'warning' | 'info';

export type DescribedError = {
  title: string;
  message: string;
  tone: ErrorTone;
  /** Field-level errors, ready to spread into form state. */
  fieldErrors: Record<string, string>;
  /** Suggested recovery, rendered as a link on the toast. */
  action?: { label: string; to: string };
  /** True when retrying the same request could plausibly succeed. */
  retryable: boolean;
};

type Recipe = Omit<Partial<DescribedError>, 'fieldErrors'>;

const BY_CODE: Record<string, Recipe> = {
  NETWORK_ERROR: {
    title: 'No connection',
    message: 'We could not reach the server. Check your connection and try again.',
    retryable: true,
  },
  DB_UNAVAILABLE: {
    title: 'Service busy',
    message: 'The platform is briefly unavailable. Please try again in a moment.',
    tone: 'warning',
    retryable: true,
  },
  RATE_LIMIT_EXCEEDED: {
    title: 'Slow down a moment',
    tone: 'warning',
    retryable: true,
  },
  VALIDATION_ERROR: {
    title: 'Check the highlighted fields',
    message: 'Some details need a second look.',
    tone: 'warning',
  },

  // ── Auth ───────────────────────────────────────────────────────────────
  INVALID_CREDENTIALS: {
    title: 'Sign-in failed',
    message: 'That email and password combination is not correct.',
  },
  EMAIL_TAKEN: {
    title: 'Email already registered',
    action: { label: 'Sign in instead', to: '/login' },
  },
  HANDLE_TAKEN: { title: 'Handle unavailable' },
  EMAIL_NOT_VERIFIED: {
    title: 'Confirm your email first',
    tone: 'warning',
    action: { label: 'Enter your code', to: '/verify-email' },
  },
  ACCOUNT_LOCKED: { title: 'Too many attempts', tone: 'warning' },
  ACCOUNT_SUSPENDED: { title: 'Account suspended' },
  ACCOUNT_BANNED: { title: 'Account banned' },
  OTP_INVALID: { title: 'Incorrect code', tone: 'warning' },
  OTP_ATTEMPTS_EXCEEDED: {
    title: 'Too many incorrect codes',
    tone: 'warning',
    action: { label: 'Request a new code', to: '/verify-email' },
  },
  TOKEN_INVALID_OR_EXPIRED: {
    title: 'Link or code expired',
    tone: 'warning',
  },
  TOKEN_EXPIRED: {
    title: 'Session expired',
    message: 'Please sign in again to continue.',
    action: { label: 'Sign in', to: '/login' },
  },
  SESSION_REVOKED: {
    title: 'Session ended',
    message: 'For your security this session was closed. Please sign in again.',
    action: { label: 'Sign in', to: '/login' },
  },

  // ── Permissions ────────────────────────────────────────────────────────
  PERMISSION_DENIED: { title: 'Not allowed', tone: 'warning' },
  ROLE_NOT_ALLOWED: { title: 'Not allowed', tone: 'warning' },
  NOT_OWNER: {
    title: 'Not your content',
    message: 'You can only change designs and posts you created.',
    tone: 'warning',
  },

  // ── Content ────────────────────────────────────────────────────────────
  NOT_FOUND: { title: 'Not found' },
  ROUTE_NOT_FOUND: { title: 'Page not found' },
  ALREADY_REPORTED: { title: 'Already reported', tone: 'info' },
  TOPIC_LOCKED: { title: 'Thread locked', tone: 'info' },
  SELF_VOTE: { title: 'Cannot vote on your own post', tone: 'info' },
  SELF_MESSAGE: { title: 'Cannot message yourself', tone: 'info' },

  // ── Uploads ────────────────────────────────────────────────────────────
  FILE_TYPE_BLOCKED: { title: 'File type not allowed' },
  FILE_TYPE_NOT_ALLOWED: { title: 'Unsupported file type', tone: 'warning' },
  FILE_MIME_MISMATCH: { title: 'File does not match its type', tone: 'warning' },
  LIMIT_FILE_SIZE: { title: 'File too large', tone: 'warning' },
  PAYLOAD_TOO_LARGE: { title: 'Too large to upload', tone: 'warning' },
  FILE_REQUIRED: { title: 'No file selected', tone: 'warning' },

  FEATURE_DISABLED: {
    title: 'Not available yet',
    message: 'This part of the platform is not switched on.',
    tone: 'info',
  },
};

const SERVER_FAULT_TITLE = 'Something went wrong on our side';

export function describeError(error: unknown): DescribedError {
  if (!(error instanceof ApiError)) {
    return {
      title: 'Unexpected error',
      message: error instanceof Error ? error.message : 'Please try again.',
      tone: 'error',
      fieldErrors: {},
      retryable: true,
    };
  }

  const recipe = BY_CODE[error.code] ?? {};
  const isServerFault = error.status >= 500;

  return {
    title: recipe.title ?? (isServerFault ? SERVER_FAULT_TITLE : 'Could not complete that'),
    // The server's message is usually the most specific thing available.
    message: error.message || recipe.message || 'Please try again.',
    tone: recipe.tone ?? 'error',
    fieldErrors: error.fieldErrors,
    action: recipe.action,
    retryable: recipe.retryable ?? isServerFault,
  };
}

/** Convenience for `catch` blocks that only need a sentence. */
export function errorMessage(error: unknown): string {
  return describeError(error).message;
}
