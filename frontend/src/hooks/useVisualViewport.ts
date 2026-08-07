import { useEffect, useState } from 'react';

type VisualViewportState = {
  /** Visible viewport height — shrinks when the soft keyboard opens. */
  height: number;
  /** How far the visual viewport has scrolled from the layout top (iOS). */
  offsetTop: number;
  width: number;
};

function readViewport(): VisualViewportState {
  if (typeof window === 'undefined') {
    return { height: 0, offsetTop: 0, width: 0 };
  }
  const vv = window.visualViewport;
  return {
    height: vv?.height ?? window.innerHeight,
    offsetTop: vv?.offsetTop ?? 0,
    width: vv?.width ?? window.innerWidth,
  };
}

/**
 * Tracks the visual viewport so mobile chat can sit above the soft keyboard.
 * iOS Safari does not shrink `100vh` / `100dvh` when the keyboard opens;
 * `visualViewport.height` does.
 */
export function useVisualViewport(enabled = true): VisualViewportState {
  const [state, setState] = useState<VisualViewportState>(readViewport);

  useEffect(() => {
    if (!enabled) return;

    const sync = () => setState(readViewport());
    sync();

    const vv = window.visualViewport;
    vv?.addEventListener('resize', sync);
    vv?.addEventListener('scroll', sync);
    window.addEventListener('resize', sync);

    return () => {
      vv?.removeEventListener('resize', sync);
      vv?.removeEventListener('scroll', sync);
      window.removeEventListener('resize', sync);
    };
  }, [enabled]);

  return state;
}

/** True below the `sm` Tailwind breakpoint (640px). */
export function useIsMobileChat() {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(max-width: 639px)').matches : false,
  );

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)');
    const onChange = () => setIsMobile(mq.matches);
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return isMobile;
}
