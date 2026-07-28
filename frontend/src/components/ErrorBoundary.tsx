/**
 * Render-time crash guard (SCR-040 · CHIP-059).
 *
 * A thrown render error would otherwise blank the whole page. This catches it,
 * keeps the shell intact and offers the two things that actually help: retry
 * without a full reload, or go somewhere known-good.
 */
import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

type Props = {
  children: ReactNode;
  /** Optional custom fallback; receives the error and a reset callback. */
  fallback?: (error: Error, reset: () => void) => ReactNode;
};

type State = { error: Error | null };

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Kept on the console rather than sent anywhere — wire this to your error
    // reporter (Sentry et al.) when one is chosen.
    console.error('Render error:', error, info.componentStack);
  }

  reset = () => this.setState({ error: null });

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    if (this.props.fallback) return this.props.fallback(error, this.reset);

    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas px-6 py-16">
        <div className="w-full max-w-md rounded-[16px] border border-line bg-canvas p-8 text-center shadow-soft">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-coral/15 text-deep-coral">
            <svg width="22" height="22" viewBox="0 0 20 20" fill="none" aria-hidden>
              <path d="M10 2.75 18 16.5H2L10 2.75Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
              <path d="M10 8v3.4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              <circle cx="10" cy="13.9" r="1" fill="currentColor" />
            </svg>
          </span>

          <h1 className="mt-5 font-display text-xl font-bold text-aubergine">This page hit a snag</h1>
          <p className="mt-2 text-sm leading-relaxed text-ink-70">
            Something broke while rendering. Nothing you did caused it, and your work is not lost.
          </p>

          {import.meta.env.DEV ? (
            <pre className="mt-4 max-h-40 overflow-auto rounded-field border border-line bg-periwinkle-tint/20 p-3 text-left text-xs text-ink-70">
              {error.message}
            </pre>
          ) : null}

          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <button type="button" onClick={this.reset} className="btn-primary justify-center">
              Try again
            </button>
            <a href="/designs" className="btn-ghost justify-center">
              Back to designs
            </a>
          </div>
        </div>
      </div>
    );
  }
}
