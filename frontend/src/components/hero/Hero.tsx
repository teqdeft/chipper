import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { hero } from '@/lib/content';
import { heroScroll } from '@/lib/heroScroll';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { MagneticButton } from '@/components/ui/MagneticButton';

/**
 * Mobile layout follows the Apple product-page pattern (AirPods / iPhone):
 * full-bleed sticky film, product centered in the viewport, short overlay
 * chapters that fade in/out on scrub — not a split “copy above / video below”.
 */

const FrameSequence = lazy(() => import('./FrameSequence'));

const words = hero.title;

export default function Hero() {
  const reduced = useReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);
  const primaryRef = useRef<HTMLDivElement>(null);
  const cap1Ref = useRef<HTMLDivElement>(null);
  const cap2Ref = useRef<HTMLDivElement>(null);
  const hintRef = useRef<HTMLDivElement>(null);
  const glowA = useRef<HTMLDivElement>(null);
  const glowB = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (reduced || !sectionRef.current) {
      heroScroll.progress = 0;
      return;
    }
    gsap.registerPlugin(ScrollTrigger);
    ScrollTrigger.config({ ignoreMobileResize: true });

    const section = sectionRef.current;

    const mm = gsap.matchMedia();

    mm.add(
      {
        isMobile: '(max-width: 767px)',
        isDesktop: '(min-width: 768px)',
      },
      (ctx) => {
        const { isMobile } = ctx.conditions as { isMobile: boolean; isDesktop: boolean };

        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: section,
            start: 'top top',
            end: 'bottom bottom',
            scrub: isMobile ? 0.3 : 0.5,
            onUpdate: (self) => {
              heroScroll.progress = self.progress;
            },
          },
        });

        if (isMobile) {
          // Exclusive chapters — no crossfade overlap (short durations + gaps).
          tl.to(hintRef.current, { autoAlpha: 0, duration: 0.08, ease: 'none' }, 0.02);
          tl.to(primaryRef.current, { autoAlpha: 0, y: -18, duration: 0.1, ease: 'none' }, 0.2);
          // primary fully gone by ~0.30

          tl.fromTo(
            cap1Ref.current,
            { autoAlpha: 0, y: 18 },
            { autoAlpha: 1, y: 0, duration: 0.1, ease: 'none' },
            0.34,
          );
          tl.to(cap1Ref.current, { autoAlpha: 0, y: -14, duration: 0.1, ease: 'none' }, 0.52);
          // gap — nothing visible ~0.62

          tl.fromTo(
            cap2Ref.current,
            { autoAlpha: 0, y: 18 },
            { autoAlpha: 1, y: 0, duration: 0.1, ease: 'none' },
            0.64,
          );
          tl.to(cap2Ref.current, { autoAlpha: 0, duration: 0.1, ease: 'none' }, 0.88);

          tl.to(glowA.current, { opacity: 0.3, duration: 0.4, ease: 'none' }, 0);
          tl.to(glowB.current, { opacity: 0.36, duration: 0.4, ease: 'none' }, 0.2);
        } else {
          tl.to(hintRef.current, { autoAlpha: 0, duration: 0.1, ease: 'none' }, 0.02);
          tl.to(primaryRef.current, { autoAlpha: 0, yPercent: -10, duration: 0.12, ease: 'none' }, 0.16);
          // primary fully gone by ~0.28

          tl.fromTo(
            cap1Ref.current,
            { autoAlpha: 0, y: 20 },
            { autoAlpha: 1, y: 0, duration: 0.1, ease: 'none' },
            0.34,
          );
          tl.to(cap1Ref.current, { autoAlpha: 0, y: -16, duration: 0.1, ease: 'none' }, 0.54);

          tl.fromTo(
            cap2Ref.current,
            { autoAlpha: 0, y: 20 },
            { autoAlpha: 1, y: 0, duration: 0.1, ease: 'none' },
            0.66,
          );
          tl.to(cap2Ref.current, { autoAlpha: 0, duration: 0.1, ease: 'none' }, 0.9);

          tl.to(glowA.current, { opacity: 0.35, duration: 0.45, ease: 'none' }, 0);
          tl.to(glowB.current, { opacity: 0.45, duration: 0.45, ease: 'none' }, 0.25);
        }
      },
    );

    return () => {
      mm.revert();
    };
  }, [reduced]);

  return (
    <section
      ref={sectionRef}
      id="hero"
      aria-label="Chipper — share what you build"
      // Mobile scrub ~2× viewport (Apple keeps mobile pins short); desktop stays long.
      className={reduced ? 'relative' : 'relative h-[200vh] md:h-[360vh]'}
    >
      <div className="sticky top-0 h-[100svh] w-full overflow-hidden bg-canvas">
        {/* Full-bleed film on every breakpoint — product owns the frame */}
        <div className="absolute inset-0">
          <Suspense fallback={<div className="h-full w-full" aria-hidden />}>
            <FrameSequence />
          </Suspense>
        </div>

        {/* Soft brand wash */}
        <div className="pointer-events-none absolute inset-0 mix-blend-soft-light" aria-hidden>
          <div
            ref={glowA}
            className="absolute left-[4%] top-[8%] h-[55vw] w-[55vw] rounded-full opacity-20 blur-3xl md:left-[2%] md:top-[6%] md:h-[60vw] md:w-[60vw]"
            style={{
              background: 'radial-gradient(circle, rgba(252,113,71,0.85), transparent 62%)',
            }}
          />
          <div
            ref={glowB}
            className="absolute bottom-[4%] right-[2%] h-[50vw] w-[50vw] rounded-full opacity-20 blur-3xl md:bottom-[2%] md:h-[52vw] md:w-[52vw]"
            style={{
              background: 'radial-gradient(circle, rgba(153,153,221,0.85), transparent 64%)',
            }}
          />
        </div>

        {/* Desktop: edge vignette + left reading zone */}
        <div
          className="pointer-events-none absolute inset-0 hidden md:block"
          style={{
            background:
              'radial-gradient(120% 110% at 62% 45%, transparent 40%, rgba(255,252,249,0.4) 72%, #FFFCF9 100%)',
          }}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-0 hidden md:block"
          style={{
            background:
              'linear-gradient(90deg, rgba(255,252,249,0.97) 0%, rgba(255,252,249,0.9) 20%, rgba(255,252,249,0.62) 38%, rgba(255,252,249,0.18) 55%, transparent 70%)',
          }}
          aria-hidden
        />

        {/* Mobile: center reading wash — content sits mid-viewport */}
        <div
          className="pointer-events-none absolute inset-0 md:hidden"
          style={{
            background:
              'radial-gradient(95% 55% at 50% 42%, rgba(255,252,249,0.94) 0%, rgba(255,252,249,0.72) 42%, rgba(255,252,249,0.2) 68%, transparent 82%), linear-gradient(180deg, rgba(255,252,249,0.75) 0%, transparent 22%), linear-gradient(0deg, rgba(255,252,249,0.7) 0%, transparent 18%)',
          }}
          aria-hidden
        />

        {/*
          Single text stage — primary + captions stack in one slot.
          Mobile: dead-center in the viewport. Desktop: left reading column.
        */}
        <div className="absolute inset-0 z-10 flex items-center justify-center md:justify-start">
          <div className="container-content flex w-full justify-center md:justify-start">
            <div className="relative flex w-full max-w-[22rem] flex-col items-center md:max-w-xl md:items-start lg:max-w-2xl">
              {/* Chapter 0 — offer */}
              <div
                ref={primaryRef}
                className="flex w-full flex-col items-center text-center md:items-start md:text-left"
              >
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={mounted ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
                  className="eyebrow mb-3 text-deep-coral sm:mb-6"
                >
                  <span className="md:hidden">Open organ-on-chip</span>
                  <span className="hidden md:inline">{hero.eyebrow}</span>
                </motion.p>

                <h1 className="w-full text-[clamp(2.55rem,12vw,3.25rem)] font-extrabold leading-[0.9] tracking-[-0.03em] text-aubergine md:text-display-xl md:leading-[0.92]">
                  {words.map((w, i) => (
                    <span key={w} className="block overflow-hidden">
                      <motion.span
                        className="block"
                        initial={{ y: '110%' }}
                        animate={mounted ? { y: '0%' } : {}}
                        transition={{
                          duration: 0.85,
                          delay: 0.12 + i * 0.09,
                          ease: [0.22, 1, 0.36, 1],
                        }}
                      >
                        {w}
                      </motion.span>
                    </span>
                  ))}
                </h1>

                <motion.p
                  initial={{ opacity: 0, y: 12 }}
                  animate={mounted ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.75, delay: 0.42, ease: [0.22, 1, 0.36, 1] }}
                  className="mt-4 max-w-[18.5rem] text-[0.95rem] leading-relaxed text-ink-70 md:mt-8 md:max-w-xl md:text-lg lg:text-xl"
                >
                  {hero.lede}
                </motion.p>

                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={mounted ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.75, delay: 0.55, ease: [0.22, 1, 0.36, 1] }}
                  className="mt-6 flex w-max max-w-full flex-col items-stretch gap-2.5 md:mt-10 md:w-full md:max-w-lg md:grid md:grid-cols-2 md:gap-3"
                >
                  <MagneticButton href={hero.primaryCta.href} variant="primary" className="w-full justify-center">
                    {hero.primaryCta.label}
                  </MagneticButton>
                  <MagneticButton href={hero.secondaryCta.href} variant="ghost" className="w-full justify-center">
                    {hero.secondaryCta.label}
                  </MagneticButton>
                </motion.div>
              </div>

              {/* Chapter 1 */}
              {!reduced && (
                <div
                  ref={cap1Ref}
                  aria-hidden
                  className="pointer-events-none invisible absolute inset-0 flex items-center justify-center opacity-0 md:justify-start"
                >
                  <div className="max-w-[17rem] text-center md:max-w-md md:text-left">
                    <p className="eyebrow mb-2 text-deep-coral md:mb-3">
                      {hero.scrollCaptions[0].eyebrow}
                    </p>
                    <p className="font-display text-[1.45rem] font-bold leading-snug text-aubergine md:text-display-sm">
                      {hero.scrollCaptions[0].line}
                    </p>
                  </div>
                </div>
              )}

              {/* Chapter 2 */}
              {!reduced && (
                <div
                  ref={cap2Ref}
                  aria-hidden
                  className="pointer-events-none invisible absolute inset-0 flex items-center justify-center opacity-0 md:justify-start"
                >
                  <div className="max-w-[17rem] text-center md:max-w-lg md:text-left">
                    <p className="eyebrow mb-2 text-deep-coral md:mb-3">
                      {hero.scrollCaptions[1].eyebrow}
                    </p>
                    <p className="font-display text-[1.45rem] font-bold leading-snug text-aubergine md:text-display-sm">
                      {hero.scrollCaptions[1].line}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Scroll hint */}
        <div
          ref={hintRef}
          className="absolute bottom-[max(0.75rem,env(safe-area-inset-bottom))] left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-1.5 text-ink-55 sm:bottom-8 sm:gap-2"
        >
          <span className="eyebrow text-[0.65rem] sm:text-[0.72rem]">
            <span className="md:hidden">Scroll</span>
            <span className="hidden md:inline">{hero.scrollHint}</span>
          </span>
          <span className="flex h-8 w-5 items-start justify-center rounded-full border border-line-strong p-1 sm:h-9">
            <span className="h-2 w-1 animate-drift rounded-full bg-coral" />
          </span>
        </div>
      </div>
    </section>
  );
}
