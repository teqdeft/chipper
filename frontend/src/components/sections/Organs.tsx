import { motion } from 'framer-motion';
import { Section } from '@/components/ui/Section';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { RevealGroup, revealItem } from '@/components/ui/Reveal';
import { organs } from '@/lib/content';

export default function Organs() {
  return (
    <Section id="organs" tone="tint" ariaLabel="Organ models">
      <div className="max-w-3xl">
        <SectionHeading eyebrow={organs.eyebrow} title={organs.title} lede={organs.lede} />
      </div>

      <RevealGroup
        className="mt-7 grid gap-3 sm:mt-16 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3"
        stagger={0.06}
      >
        {organs.list.map((organ, i) => (
          <motion.div key={organ.name} variants={revealItem}>
            <article className="card card-hover group flex items-center justify-between gap-3 bg-canvas p-5 sm:gap-4 sm:p-6">
              <div className="flex min-w-0 items-center gap-4 sm:gap-5">
                <span className="font-display text-sm font-bold text-muted tabular-nums">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div className="min-w-0">
                  <h3 className="font-display text-lg font-bold text-aubergine sm:text-xl">{organ.name}</h3>
                  <p className="mt-1 text-sm leading-snug text-muted">{organ.note}</p>
                </div>
              </div>
              <span
                className="text-muted transition-all duration-300 ease-premium group-hover:translate-x-1 group-hover:text-coral"
                aria-hidden
              >
                →
              </span>
            </article>
          </motion.div>
        ))}
      </RevealGroup>
    </Section>
  );
}
