import { motion, useScroll, useSpring } from 'framer-motion';

/** A hairline coral progress bar. Quiet, always-on orientation cue. */
export default function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 30, mass: 0.3 });

  return (
    <motion.div
      aria-hidden
      style={{ scaleX }}
      className="fixed inset-x-0 top-0 z-[60] h-0.5 origin-left bg-coral"
    />
  );
}
