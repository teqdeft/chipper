import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Hero from '@/components/hero/Hero';
import ChipLayer from '@/components/hero/ChipLayer';
import About from '@/components/sections/About';
import { useReducedMotion } from '@/hooks/useReducedMotion';

/**
 * Hero (aubergine) + About (coral) as one continuous scroll stage.
 * Background crossfades behind the transparent chip so the handoff feels
 * merged — not a hard section cut (orgnzm-style product carry).
 */
export default function LandingIntro() {
  const stageRef = useRef<HTMLDivElement>(null);
  const aubergineRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const stage = stageRef.current;
    const aubergine = aubergineRef.current;
    if (!stage || !aubergine || reduced) return;

    gsap.registerPlugin(ScrollTrigger);
    ScrollTrigger.config({ ignoreMobileResize: true });

    // Soft aubergine → coral blend — hold dark longer on short mobile stages,
    // then ease into coral over a wider window so no hard mid-scroll cut.
    const mm = gsap.matchMedia();

    mm.add(
      {
        isMobile: '(max-width: 767px)',
        isDesktop: '(min-width: 768px)',
      },
      (ctx) => {
        const { isMobile } = ctx.conditions as { isMobile: boolean };
        const hold = isMobile ? 0.48 : 0.52;
        const span = isMobile ? 0.4 : 0.28;

        ScrollTrigger.create({
          trigger: stage,
          start: 'top top',
          end: 'bottom bottom',
          scrub: isMobile ? 0.85 : 0.65,
          onUpdate: (self) => {
            const t = gsap.utils.clamp(0, 1, (self.progress - hold) / span);
            const s = t * t * (3 - 2 * t);
            gsap.set(aubergine, { opacity: 1 - s });
          },
        });
      },
    );

    requestAnimationFrame(() => ScrollTrigger.refresh());

    return () => {
      mm.revert();
    };
  }, [reduced]);

  return (
    <div ref={stageRef} className="relative isolate">
      {/* Coral base — always present under the fading aubergine */}
      <div className="pointer-events-none absolute inset-0 z-0 bg-coral" aria-hidden />
      <div
        ref={aubergineRef}
        className="pointer-events-none absolute inset-0 z-0 bg-aubergine"
        aria-hidden
      />
      {/* Soft light wash so the glass chip reads on both grounds */}
      <div
        className="pointer-events-none absolute inset-0 z-0 opacity-40"
        style={{
          background:
            'radial-gradient(70% 55% at 72% 42%, rgba(255,252,249,0.14) 0%, transparent 58%), radial-gradient(50% 40% at 20% 80%, rgba(252,113,71,0.12) 0%, transparent 55%)',
        }}
        aria-hidden
      />

      <ChipLayer stageRef={stageRef} />

      <div className="relative z-[2]">
        <Hero />
        <About />
      </div>
    </div>
  );
}
