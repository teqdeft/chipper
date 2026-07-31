/**
 * API client.
 *
 * One place that knows how to talk to the backend:
 *  - attaches the access token
 *  - unwraps the `{ success, data, meta }` envelope
 *  - turns a failure envelope into a typed `ApiError` with field-level details
 *  - refreshes the access token once on a 401 and replays the request, with
 *    concurrent calls sharing a single refresh so a page with several requests
 *    does not fire several refreshes and invalidate each other's rotation
 */
import type { ApiFailure, ApiFieldError, ApiPagination, ApiSuccess, AuthTokens } from './types';

const BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:5000/api/v1';

const ACCESS_TOKEN_KEY = 'chipper.accessToken';
const REFRESH_TOKEN_KEY = 'chipper.refreshToken';

/** Typed error thrown by every failed request. */
export class ApiError extends Error {
  status: number;
  code: string;
  details?: ApiFieldError[] | Record<string, unknown>;

  constructor(status: number, message: string, code: string, details?: ApiError['details']) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }

  /** Field errors keyed by field name, ready to drop into a form. */
  get fieldErrors(): Record<string, string> {
    if (!Array.isArray(this.details)) return {};
    return this.details.reduce<Record<string, string>>((acc, detail) => {
      if (detail?.field && !acc[detail.field]) acc[detail.field] = detail.message;
      return acc;
    }, {});
  }

  get isNetworkError() {
    return this.status === 0;
  }
}

// ── Token storage ──────────────────────────────────────────────────────────
// localStorage keeps the session across tabs and reloads. The refresh token is
// also set as an httpOnly cookie by the API, which is the safer channel; the
// stored copy is the fallback for clients that block third-party cookies.

export const tokenStore = {
  get access() {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  },
  get refresh() {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  },
  set(tokens: Pick<AuthTokens, 'accessToken' | 'refreshToken'> | null) {
    if (!tokens) {
      localStorage.removeItem(ACCESS_TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
      return;
    }
    localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
    if (tokens.refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
  },
  clear() {
    tokenStore.set(null);
  },
};

/** Notifies the app when the session ends so the AuthProvider can reset. */
type SessionListener = () => void;
const sessionEndedListeners = new Set<SessionListener>();

export function onSessionEnded(listener: SessionListener) {
  sessionEndedListeners.add(listener);
  return () => sessionEndedListeners.delete(listener);
}

function endSession() {
  tokenStore.clear();
  sessionEndedListeners.forEach((listener) => listener());
}

// ── Refresh coordination ───────────────────────────────────────────────────
// Refresh tokens rotate server-side: using one revokes it. If two requests each
// triggered a refresh, the second would present an already-rotated token and the
// backend would treat it as theft and kill the whole session. So all callers
// await the same in-flight refresh.
let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const response = await fetch(`${BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ refreshToken: tokenStore.refresh }),
      });

      if (!response.ok) return null;

      const payload = (await response.json()) as ApiSuccess<{ tokens: AuthTokens }>;
      tokenStore.set(payload.data.tokens);
      return payload.data.tokens.accessToken;
    } catch {
      return null;
    } finally {
      // Cleared on the next tick so concurrent callers all see this result.
      setTimeout(() => {
        refreshPromise = null;
      }, 0);
    }
  })();

  return refreshPromise;
}

// ── Request ────────────────────────────────────────────────────────────────

export type RequestOptions = Omit<RequestInit, 'body'> & {
  /** JSON body — omit when sending FormData via `formData`. */
  body?: unknown;
  formData?: FormData;
  /** Skip the Authorization header (public endpoints during logout, etc.). */
  skipAuth?: boolean;
  /** Internal: prevents an infinite refresh loop. */
  _isRetry?: boolean;
};

async function request<T>(path: string, options: RequestOptions = {}): Promise<ApiSuccess<T>> {
  const { body, formData, skipAuth, _isRetry, headers, ...rest } = options;

  const requestHeaders = new Headers(headers);
  requestHeaders.set('Accept', 'application/json');

  // FormData sets its own multipart boundary — never override Content-Type.
  if (body !== undefined && !formData) requestHeaders.set('Content-Type', 'application/json');

  const token = tokenStore.access;
  if (token && !skipAuth) requestHeaders.set('Authorization', `Bearer ${token}`);

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      ...rest,
      headers: requestHeaders,
      credentials: 'include',
      body: formData ?? (body !== undefined ? JSON.stringify(body) : undefined),
    });
  } catch {
    throw new ApiError(0, 'Cannot reach the server. Check your connection and try again.', 'NETWORK_ERROR');
  }

  if (response.status === 204) {
    return { success: true, message: 'OK', data: null as T, requestId: '', timestamp: '' };
  }

  let payload: ApiSuccess<T> | ApiFailure;
  try {
    payload = (await response.json()) as ApiSuccess<T> | ApiFailure;
  } catch {
    throw new ApiError(response.status, 'The server returned an unreadable response.', 'INVALID_RESPONSE');
  }

  if (response.ok && payload.success) return payload;

  const failure = payload as ApiFailure;
  const code = failure.error?.code ?? 'ERROR';

  // An expired access token is recoverable: refresh once, then replay.
  if (response.status === 401 && !_isRetry && !skipAuth && code !== 'INVALID_CREDENTIALS') {
    const fresh = await refreshAccessToken();
    if (fresh) return request<T>(path, { ...options, _isRetry: true });
    // The session is genuinely over — sign out rather than loop.
    if (tokenStore.access || tokenStore.refresh) endSession();
  }

  throw new ApiError(response.status, failure.message ?? 'Something went wrong', code, failure.error?.details);
}

/**
 * Fetches a binary endpoint and hands back the bytes plus the filename the
 * server suggested.
 *
 * The design download streams the file rather than returning the envelope, so
 * it cannot go through `request()`. It still needs the bearer token — the API
 * records who downloaded what — which also rules out simply pointing
 * `window.location` at the URL.
 */
async function requestBlob(
  path: string,
  options: { fallbackName?: string; _isRetry?: boolean } = {},
): Promise<{ blob: Blob; fileName: string }> {
  const headers = new Headers();
  const token = tokenStore.access;
  if (token) headers.set('Authorization', `Bearer ${token}`);

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, { headers, credentials: 'include' });
  } catch {
    throw new ApiError(0, 'Cannot reach the server. Check your connection and try again.', 'NETWORK_ERROR');
  }

  if (!response.ok) {
    if (response.status === 401 && !options._isRetry) {
      const fresh = await refreshAccessToken();
      if (fresh) return requestBlob(path, { ...options, _isRetry: true });
      if (tokenStore.access || tokenStore.refresh) endSession();
    }

    // A failure still comes back as the normal JSON envelope.
    let message = 'The download could not be started.';
    let code = 'DOWNLOAD_FAILED';
    try {
      const payload = (await response.json()) as ApiFailure;
      message = payload.message ?? message;
      code = payload.error?.code ?? code;
    } catch {
      /* Not JSON — keep the generic message. */
    }
    throw new ApiError(response.status, message, code);
  }

  return {
    blob: await response.blob(),
    fileName: fileNameFromDisposition(response.headers.get('Content-Disposition'), options.fallbackName),
  };
}

/** Reads `filename*=UTF-8''…` first, then the plain `filename="…"`. */
function fileNameFromDisposition(header: string | null, fallback = 'download') {
  if (!header) return fallback;

  const encoded = /filename\*=UTF-8''([^;]+)/i.exec(header);
  if (encoded?.[1]) {
    try {
      return decodeURIComponent(encoded[1].trim().replace(/^"|"$/g, ''));
    } catch {
      /* Malformed encoding — fall through to the plain parameter. */
    }
  }

  const plain = /filename="?([^";]+)"?/i.exec(header);
  if (plain?.[1]) {
    try {
      return decodeURIComponent(plain[1].trim());
    } catch {
      return plain[1].trim();
    }
  }

  return fallback;
}

/** Saves a blob under `fileName` via a temporary object URL. */
export function saveBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Revoked on the next tick so the click has already been dispatched.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

/** Serialises query params, dropping empties and expanding arrays. */
export function toQuery(params: Record<string, unknown> = {}): string {
  const search = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    if (Array.isArray(value)) {
      if (value.length) search.set(key, value.join(','));
      return;
    }
    search.set(key, String(value));
  });

  const query = search.toString();
  return query ? `?${query}` : '';
}

export const api = {
  get: <T>(path: string, options?: RequestOptions) => request<T>(path, { ...options, method: 'GET' }),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'POST', body }),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'PATCH', body }),
  put: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'PUT', body }),
  delete: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'DELETE', body }),
  upload: <T>(path: string, formData: FormData, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'POST', formData }),
  /** Authenticated binary GET — returns the bytes and the server's filename. */
  blob: (path: string, fallbackName?: string) => requestBlob(path, { fallbackName }),
  endSession,
};

export type { ApiPagination, ApiSuccess };
