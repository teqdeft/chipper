import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { hero } from '@/lib/content';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { MagneticButton } from '@/components/ui/MagneticButton';

const words = hero.title;

/**
 * "organ-on-chip" breaks at its hyphens on a phone-width measure and reads as
 * a typo. Keep every hyphenated compound on one line; the rest wraps normally.
 */
function keepCompoundsWhole(text: string) {
  return text
    .split(/(\S+-\S+)/g)
    .map((part, i) =>
      /^\S+-\S+$/.test(part) ? (
        <span key={i} className="whitespace-nowrap">
          {part}
        </span>
      ) : (
        part
      ),
    );
}

/**
 * Aubergine hero copy + scroll chapters.
 * Ground colour comes from LandingIntro so the transparent chip can sit over it.
 */
export default function Hero() {
  const reduced = useReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);
  const veilRef = useRef<HTMLDivElement>(null);
  const primaryRef = useRef<HTMLDivElement>(null);
  const cap1Ref = useRef<HTMLDivElement>(null);
  const cap2Ref = useRef<HTMLDivElement>(null);
  const hintRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (reduced || !sectionRef.current) return;
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
        const { isMobile } = ctx.conditions as { isMobile: boolean };

        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: section,
            start: 'top top',
            end: 'bottom bottom',
            scrub: isMobile ? 0.3 : 0.5,
          },
        });

        tl.to(hintRef.current, { autoAlpha: 0, duration: 0.08, ease: 'none' }, 0.02);
        tl.to(
          primaryRef.current,
          {
            autoAlpha: 0,
            y: isMobile ? -18 : 0,
            yPercent: isMobile ? 0 : -10,
            duration: 0.12,
            ease: 'none',
          },
          0.16,
        );
        // Lift the dark reading veil before coral so the chip handoff stays clean.
        tl.to(veilRef.current, { autoAlpha: 0, duration: 0.22, ease: 'none' }, 0.72);

        tl.fromTo(
          cap1Ref.current,
          { autoAlpha: 0, y: isMobile ? 18 : 20 },
          { autoAlpha: 1, y: 0, duration: 0.1, ease: 'none' },
          0.34,
        );
        tl.to(
          cap1Ref.current,
          { autoAlpha: 0, y: isMobile ? -14 : -16, duration: 0.1, ease: 'none' },
          0.54,
        );

        tl.fromTo(
          cap2Ref.current,
          { autoAlpha: 0, y: isMobile ? 18 : 20 },
          { autoAlpha: 1, y: 0, duration: 0.1, ease: 'none' },
          0.66,
        );
        tl.to(cap2Ref.current, { autoAlpha: 0, duration: 0.1, ease: 'none' }, 0.9);
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
      className={reduced ? 'relative' : 'relative h-[200vh] md:h-[280vh]'}
    >
      {/* Transparent sticky stage — aubergine fill is on LandingIntro behind the chip.
          Use dvh so mobile chrome collapse doesn't leave a short sticky band / colour seam. */}
      <div className="sticky top-0 h-[100dvh] min-h-[100svh] w-full overflow-hidden">
        {/* Reading veil — keeps type crisp without baking the chip onto a plate */}
        <div ref={veilRef} className="pointer-events-none absolute inset-0" aria-hidden>
          <div
            className="absolute inset-0 hidden md:block"
            style={{
              background:
                'linear-gradient(90deg, rgba(69,8,31,0.94) 0%, rgba(69,8,31,0.78) 26%, rgba(69,8,31,0.28) 48%, transparent 66%)',
            }}
          />
          {/* Mobile: soft centre wash only — no bottom band (that read as a hard colour cut on scroll). */}
          <div
            className="absolute inset-0 md:hidden"
            style={{
              background:
                'radial-gradient(120% 70% at 50% 38%, rgba(69,8,31,0.78) 0%, rgba(69,8,31,0.38) 42%, rgba(69,8,31,0.12) 68%, transparent 82%), linear-gradient(180deg, rgba(69,8,31,0.4) 0%, transparent 22%)',
            }}
          />
          <div
            className="absolute inset-0 opacity-90"
            style={{
              background:
                'radial-gradient(90% 70% at 72% 48%, rgba(252,113,71,0.14) 0%, transparent 55%), radial-gradient(70% 55% at 18% 80%, rgba(153,153,221,0.08) 0%, transparent 60%)',
            }}
          />
        </div>

        <div className="absolute inset-0 z-20 flex items-center justify-center md:justify-start">
          <div className="container-content flex w-full justify-center md:justify-start">
            <div className="relative flex w-full max-w-[22rem] flex-col items-center md:max-w-xl md:items-start lg:max-w-2xl">
              <div
                ref={primaryRef}
                className="flex w-full flex-col items-center text-center md:items-start md:text-left"
              >
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={mounted ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
                  className="eyebrow mb-4 whitespace-nowrap text-coral sm:mb-6"
                >
                  <span className="md:hidden">Open organ-on-chip</span>
                  <span className="hidden md:inline">{hero.eyebrow}</span>
                </motion.p>

                <h1 className="w-full text-[clamp(2.55rem,12vw,3.25rem)] font-extrabold leading-[0.9] tracking-[-0.03em] text-canvas md:text-display-xl md:leading-[0.92]">
                  {words.map((w, i) => (
                    // The mask is the line box, and at leading 0.9 that box is
                    // shorter than the glyphs — it was clipping the tail of the
                    // "y" in "you". Pad the mask, pull the padding back out of
                    // the flow, and start the reveal lower so nothing peeks.
                    <span key={`${w}-${i}`} className="-mb-[0.18em] block overflow-hidden pb-[0.18em]">
                      <motion.span
                        className="block"
                        initial={{ y: '120%' }}
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
                  className="mt-5 w-full text-[1rem] leading-[1.6] text-canvas/75 md:mt-8 md:max-w-xl md:text-lg md:leading-relaxed lg:text-xl"
                >
                  {keepCompoundsWhole(hero.lede)}
                </motion.p>

                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={mounted ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.75, delay: 0.55, ease: [0.22, 1, 0.36, 1] }}
                  className="mt-7 flex w-full flex-col items-stretch gap-3 md:mt-10 md:max-w-lg md:grid md:grid-cols-2"
                >
                  <MagneticButton
                    href={hero.primaryCta.href}
                    variant="primary"
                    className="w-full justify-center py-3.5 sm:py-3"
                  >
                    {hero.primaryCta.label}
                  </MagneticButton>
                  <MagneticButton
                    href={hero.secondaryCta.href}
                    variant="ghost"
                    className="btn-ghost-invert w-full justify-center py-3.5 sm:py-3"
                  >
                    {hero.secondaryCta.label}
                  </MagneticButton>
                </motion.div>
              </div>

              {!reduced && (
                <div
                  ref={cap1Ref}
                  aria-hidden
                  className="pointer-events-none invisible absolute inset-0 flex items-center justify-center opacity-0 md:justify-start"
                >
                  <div className="w-full text-center md:max-w-md md:text-left">
                    <p className="eyebrow mb-3 text-coral">{hero.scrollCaptions[0].eyebrow}</p>
                    <p className="font-display text-[1.55rem] font-bold leading-[1.2] text-canvas md:text-display-sm md:leading-snug">
                      {keepCompoundsWhole(hero.scrollCaptions[0].line)}
                    </p>
                  </div>
                </div>
              )}

              {!reduced && (
                <div
                  ref={cap2Ref}
                  aria-hidden
                  className="pointer-events-none invisible absolute inset-0 flex items-center justify-center opacity-0 md:justify-start"
                >
                  <div className="w-full text-center md:max-w-lg md:text-left">
                    <p className="eyebrow mb-3 text-coral">{hero.scrollCaptions[1].eyebrow}</p>
                    <p className="font-display text-[1.55rem] font-bold leading-[1.2] text-canvas md:text-display-sm md:leading-snug">
                      {keepCompoundsWhole(hero.scrollCaptions[1].line)}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div
          ref={hintRef}
          className="absolute bottom-[max(0.75rem,env(safe-area-inset-bottom))] left-1/2 z-20 flex -translate-x-1/2 flex-col items-center gap-1.5 text-canvas/55 sm:bottom-8 sm:gap-2"
        >
          <span className="eyebrow text-[0.65rem] tracking-[0.18em] text-canvas/55 sm:text-[0.72rem]">
            <span className="md:hidden">Scroll</span>
            <span className="hidden md:inline">{hero.scrollHint}</span>
          </span>
          <span className="flex h-8 w-5 items-start justify-center rounded-full border border-canvas/35 p-1 sm:h-9">
            <span className="h-2 w-1 animate-drift rounded-full bg-coral" />
          </span>
        </div>
      </div>
    </section>
  );
}
