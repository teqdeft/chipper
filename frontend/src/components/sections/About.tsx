import { motion } from 'framer-motion';
import { Section } from '@/components/ui/Section';
import { Eyebrow } from '@/components/ui/SectionHeading';
import { Reveal, RevealGroup, revealItem } from '@/components/ui/Reveal';
import { about } from '@/lib/content';

export default function About() {
  return (
    <Section id="about" tone="canvas" ariaLabel="What is an organ-on-a-chip">
      <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:gap-24">
        <div>
          <Reveal>
            <Eyebrow>{about.eyebrow}</Eyebrow>
          </Reveal>
          <Reveal delay={0.05}>
            <h2 className="mt-4 text-display-md font-extrabold text-aubergine sm:mt-6">{about.title}</h2>
          </Reveal>
          <div className="mt-6 space-y-4 sm:mt-8 sm:space-y-6">
            {about.body.map((p, i) => (
              <Reveal key={i} delay={0.1 + i * 0.05}>
                <p className="max-w-prose text-base leading-relaxed text-ink-70 sm:text-lg">{p}</p>
              </Reveal>
            ))}
          </div>
        </div>

        <RevealGroup className="flex flex-col justify-center gap-3 sm:gap-4" stagger={0.1}>
          {about.points.map((point) => (
            <motion.div key={point.k} variants={revealItem}>
              <div className="card card-hover p-5 sm:p-6">
                <div className="flex items-baseline gap-3 sm:gap-4">
                  <span className="data-unit text-sm">·</span>
                  <div>
                    <h3 className="font-display text-lg font-bold text-aubergine">{point.k}</h3>
                    <p className="mt-1.5 text-[0.95rem] leading-relaxed text-ink-70">{point.v}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </RevealGroup>
      </div>
    </Section>
  );
}
