import { AnimatePresence, motion, useReducedMotion, type Variants } from 'framer-motion';
import { useLocation, useOutlet } from 'react-router-dom';
import type { ReactNode } from 'react';

export const premiumEase = [0.22, 1, 0.36, 1] as const;

type RevealProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
  as?: 'div' | 'li' | 'span' | 'section';
  id?: string;
  role?: string;
  'aria-label'?: string;
  'aria-labelledby'?: string;
  'aria-hidden'?: boolean | 'true' | 'false';
};

/**
 * Fade-up-on-enter. The single reveal primitive used across the page so motion
 * reads as one coherent system. Honours reduced-motion by rendering static.
 */
export function Reveal({
  children,
  className,
  delay = 0,
  y = 22,
  as = 'div',
  ...rest
}: RevealProps) {
  const reduced = useReducedMotion();
  const MotionTag = motion[as];

  if (reduced) {
    const Tag = as;
    return (
      <Tag className={className} {...rest}>
        {children}
      </Tag>
    );
  }

  return (
    <MotionTag
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      // Start a bit earlier so first Hero→About entry isn't a sudden cascade.
      viewport={{ once: true, margin: '0px 0px -4% 0px', amount: 0.2 }}
      transition={{ duration: 0.55, delay, ease: premiumEase }}
      {...rest}
    >
      {children}
    </MotionTag>
  );
}

/** Stagger container — children reveal in sequence for an "expensive" cascade. */
export function RevealGroup({
  children,
  className,
  stagger = 0.08,
}: {
  children: ReactNode;
  className?: string;
  stagger?: number;
}) {
  const reduced = useReducedMotion();
  if (reduced) return <div className={className}>{children}</div>;

  const container: Variants = {
    hidden: {},
    show: { transition: { staggerChildren: stagger, delayChildren: 0.04 } },
  };

  return (
    <motion.div
      className={className}
      variants={container}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '0px 0px -4% 0px', amount: 0.15 }}
    >
      {children}
    </motion.div>
  );
}

export const revealItem: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: premiumEase },
  },
};

/** Use inside RevealGroup — wraps one staggered child. */
export function RevealItem({
  children,
  className,
  as = 'div',
}: {
  children: ReactNode;
  className?: string;
  as?: 'div' | 'li' | 'article';
}) {
  const reduced = useReducedMotion();
  if (reduced) {
    const Tag = as;
    return <Tag className={className}>{children}</Tag>;
  }
  const MotionTag = motion[as];
  return (
    <MotionTag className={className} variants={revealItem}>
      {children}
    </MotionTag>
  );
}

/**
 * Route enter motion — used by layout shells so every page feels like the home cascade.
 * No exit wait (avoids blank flash between routes).
 */
export function AnimatedOutlet() {
  const location = useLocation();
  const outlet = useOutlet();
  const reduced = useReducedMotion();

  if (reduced) return <>{outlet}</>;

  return (
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.45, ease: premiumEase }}
      >
        {outlet}
      </motion.div>
    </AnimatePresence>
  );
}
