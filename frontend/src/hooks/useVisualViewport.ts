import { useEffect, useState } from 'react';

type VisualViewportState = {
  /** Visible viewport height — shrinks when the soft keyboard opens. */
  height: number;
  /** How far the visual viewport has scrolled from the layout top (iOS). */
  offsetTop: number;
  width: number;
  /** Pinch / focus zoom level. 1 whenever the page is not zoomed. */
  scale: number;
};

function readViewport(): VisualViewportState {
  if (typeof window === 'undefined') {
    return { height: 0, offsetTop: 0, width: 0, scale: 1 };
  }
  const vv = window.visualViewport;
  return {
    height: vv?.height ?? window.innerHeight,
    offsetTop: vv?.offsetTop ?? 0,
    width: vv?.width ?? window.innerWidth,
    scale: vv?.scale ?? 1,
  };
}

function sameViewport(a: VisualViewportState, b: VisualViewportState) {
  return (
    a.height === b.height &&
    a.offsetTop === b.offsetTop &&
    a.width === b.width &&
    a.scale === b.scale
  );
}

/** Above this, visual and layout viewport coordinates no longer agree. */
export const ZOOM_EPSILON = 1.01;

/**
 * Tracks the visual viewport so mobile chat can sit above the soft keyboard.
 * iOS Safari does not shrink `100vh` / `100dvh` when the keyboard opens;
 * `visualViewport.height` does.
 */
export function useVisualViewport(enabled = true): VisualViewportState {
  const [state, setState] = useState<VisualViewportState>(readViewport);

  useEffect(() => {
    if (!enabled) return;

    let frame = 0;
    // Consumers write these numbers back into layout, and on iOS a layout write
    // emits another resize/scroll. Coalesce to one read per frame and bail when
    // nothing moved, so the two can never drive each other.
    const sync = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const next = readViewport();
        setState((prev) => (sameViewport(prev, next) ? prev : next));
      });
    };
    setState((prev) => {
      const next = readViewport();
      return sameViewport(prev, next) ? prev : next;
    });

    const vv = window.visualViewport;
    vv?.addEventListener('resize', sync);
    vv?.addEventListener('scroll', sync);
    window.addEventListener('resize', sync);

    return () => {
      if (frame) cancelAnimationFrame(frame);
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
