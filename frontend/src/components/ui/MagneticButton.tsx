import { useRef, type MouseEvent, type ReactNode, type RefObject } from 'react';
import { Link } from 'react-router-dom';
import { motion, useMotionValue, useSpring, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';

type MagneticButtonProps = {
  children: ReactNode;
  href?: string;
  onClick?: () => void;
  variant?: 'primary' | 'get' | 'ghost';
  className?: string;
  ariaLabel?: string;
};

const variantClass = {
  primary: 'btn-primary',
  get: 'btn-get',
  ghost: 'btn-ghost',
} as const;

const MotionLink = motion(Link);

/**
 * Magnetic CTA — the button leans toward the cursor, then springs back.
 * A deliberate "spend the budget here" moment. Static under reduced-motion,
 * and it stays a real <a>/<button> so keyboard and screen readers are unaffected.
 */
export function MagneticButton({
  children,
  href,
  onClick,
  variant = 'primary',
  className,
  ariaLabel,
}: MagneticButtonProps) {
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 200, damping: 15, mass: 0.4 });
  const sy = useSpring(y, { stiffness: 200, damping: 15, mass: 0.4 });

  const handleMove = (e: MouseEvent) => {
    if (reduced || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const relX = e.clientX - (rect.left + rect.width / 2);
    const relY = e.clientY - (rect.top + rect.height / 2);
    x.set(relX * 0.28);
    y.set(relY * 0.32);
  };

  const reset = () => {
    x.set(0);
    y.set(0);
  };

  const inner = <span className="relative z-10 inline-flex items-center gap-2">{children}</span>;
  const cls = cn(variantClass[variant], 'relative', className);

  if (href) {
    if (href.startsWith('/')) {
      return (
        <MotionLink
          ref={ref as RefObject<HTMLAnchorElement>}
          to={href}
          aria-label={ariaLabel}
          onMouseMove={handleMove}
          onMouseLeave={reset}
          style={{ x: sx, y: sy }}
          className={cls}
        >
          {inner}
        </MotionLink>
      );
    }
    return (
      <motion.a
        ref={ref as RefObject<HTMLAnchorElement>}
        href={href}
        aria-label={ariaLabel}
        onMouseMove={handleMove}
        onMouseLeave={reset}
        style={{ x: sx, y: sy }}
        className={cls}
      >
        {inner}
      </motion.a>
    );
  }

  return (
    <motion.button
      ref={ref as RefObject<HTMLButtonElement>}
      type="button"
      aria-label={ariaLabel}
      onClick={onClick}
      onMouseMove={handleMove}
      onMouseLeave={reset}
      style={{ x: sx, y: sy }}
      className={cls}
    >
      {inner}
    </motion.button>
  );
}
