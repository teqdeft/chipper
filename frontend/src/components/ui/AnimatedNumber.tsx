import { useEffect, useRef, useState } from 'react';
import { useInView, useReducedMotion } from 'framer-motion';

/**
 * Count-up statistic. Animates once when scrolled into view. Respects
 * reduced-motion (renders the final value immediately) and uses tabular
 * numbers so the digits don't jitter width as they tick.
 */
export function AnimatedNumber({
  value,
  suffix = '',
  decimals = 0,
  duration = 1600,
}: {
  value: number;
  suffix?: string;
  decimals?: number;
  duration?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '0px 0px -20% 0px' });
  const reduced = useReducedMotion();
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!inView) return;
    if (reduced) {
      setDisplay(value);
      return;
    }
    let raf = 0;
    let start: number | null = null;
    const ease = (t: number) => 1 - Math.pow(1 - t, 3); // cubic ease-out

    const tick = (now: number) => {
      if (start === null) start = now;
      const t = Math.min(1, (now - start) / duration);
      setDisplay(value * ease(t));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, value, duration, reduced]);

  return (
    <span ref={ref} className="tabular-nums" style={{ fontVariantNumeric: 'tabular-nums' }}>
      {display.toFixed(decimals)}
      {suffix}
    </span>
  );
}
