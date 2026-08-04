import { motion } from 'framer-motion';
import { Section } from '@/components/ui/Section';
import { Reveal, RevealGroup, revealItem } from '@/components/ui/Reveal';
import { about } from '@/lib/content';

/**
 * Coral band — chip lands here after the aubergine → coral blend.
 * Right column stays open as a quiet product stage.
 */
export default function About() {
  return (
    <Section
      id="about"
      tone="canvas"
      ariaLabel="What is an organ-on-a-chip"
      className="relative !bg-transparent pb-24 pt-10 text-aubergine sm:pb-28 sm:pt-16 md:pb-36"
    >
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)] lg:items-center lg:gap-16 xl:gap-20">
        <div className="relative max-w-xl">
          <Reveal>
            <span className="eyebrow inline-flex items-center gap-2 text-aubergine">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-aubergine" aria-hidden />
              {about.eyebrow}
            </span>
          </Reveal>
          <Reveal delay={0.05}>
            <h2 className="mt-4 text-display-md font-extrabold text-aubergine sm:mt-6">
              {about.title}
            </h2>
          </Reveal>
          <div className="mt-6 space-y-4 sm:mt-8 sm:space-y-5">
            {about.body.map((p, i) => (
              <Reveal key={i} delay={0.1 + i * 0.05}>
                <p className="max-w-prose text-base leading-relaxed text-aubergine/80 sm:text-lg">{p}</p>
              </Reveal>
            ))}
          </div>

          <RevealGroup className="mt-8 flex flex-col gap-3 sm:mt-10 sm:gap-3.5" stagger={0.08}>
            {about.points.map((point) => (
              <motion.div key={point.k} variants={revealItem}>
                <div className="rounded-card border border-aubergine/10 bg-surface/85 p-5 shadow-soft backdrop-blur-[2px] sm:p-6">
                  <div className="flex items-baseline gap-3 sm:gap-4">
                    <span className="font-display text-sm font-bold text-aubergine/35">·</span>
                    <div>
                      <h3 className="font-display text-lg font-bold text-aubergine">{point.k}</h3>
                      <p className="mt-1.5 text-[0.95rem] leading-relaxed text-aubergine/70">{point.v}</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </RevealGroup>
        </div>

        {/* Quiet landing pad — chip settles here as the colour blend finishes */}
        <div className="relative hidden min-h-[32rem] lg:block xl:min-h-[36rem]" aria-hidden />
      </div>
    </Section>
  );
}
