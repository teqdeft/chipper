import { useEffect, type ReactNode } from 'react';
import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useReducedMotion } from '@/hooks/useReducedMotion';

/**
 * One scroll system for the whole page. Lenis drives smooth wheel scroll on
 * desktop; touch stays native so mobile vertical + horizontal sliders work.
 */
export default function SmoothScrollProvider({ children }: { children: ReactNode }) {
  const reduced = useReducedMotion();

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    // Mobile browser chrome show/hide shouldn't constantly refresh ScrollTrigger.
    ScrollTrigger.config({ ignoreMobileResize: true });

    if (reduced) {
      ScrollTrigger.refresh();
      return;
    }

    const lenis = new Lenis({
      duration: 1.1,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      // Critical: leave touch to the browser so vertical page scroll and
      // horizontal overflow sliders both work with the thumb.
      syncTouch: false,
      wheelMultiplier: 1,
      gestureOrientation: 'vertical',
    });

    lenis.on('scroll', ScrollTrigger.update);
    (window as unknown as { __lenis?: Lenis }).__lenis = lenis;

    const raf = (time: number) => {
      lenis.raf(time * 1000);
    };
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);

    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest('a[href^="#"]') as HTMLAnchorElement | null;
      if (!anchor) return;
      const id = anchor.getAttribute('href');
      if (!id || id === '#') return;
      const el = document.querySelector(id);
      if (!el) return;
      e.preventDefault();
      lenis.scrollTo(el as HTMLElement, { offset: -80, duration: 1.4 });
    };
    document.addEventListener('click', onClick);

    const t = window.setTimeout(() => ScrollTrigger.refresh(), 600);

    return () => {
      document.removeEventListener('click', onClick);
      gsap.ticker.remove(raf);
      lenis.destroy();
      window.clearTimeout(t);
    };
  }, [reduced]);

  return <>{children}</>;
}
