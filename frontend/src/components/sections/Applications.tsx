import { motion } from 'framer-motion';
import { Section } from '@/components/ui/Section';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { RevealGroup, revealItem } from '@/components/ui/Reveal';
import { MobileSlider } from '@/components/ui/MobileSlider';
import { applications } from '@/lib/content';

function ApplicationCard({
  card,
  index,
}: {
  card: (typeof applications.cards)[number];
  index: number;
}) {
  return (
    <article className="card card-hover flex h-full flex-col gap-2.5 p-5 sm:gap-3 sm:p-7">
      <span className="data-unit text-sm tabular-nums">0{index + 1}</span>
      <h3 className="font-display text-lg font-bold text-aubergine sm:text-xl">{card.title}</h3>
      <p className="text-[0.92rem] leading-relaxed text-muted sm:text-[0.95rem]">{card.body}</p>
    </article>
  );
}

export default function Applications() {
  return (
    <Section id="applications" tone="canvas" ariaLabel="Why it matters">
      <div className="grid min-w-0 gap-6 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
        <div className="min-w-0 lg:sticky lg:top-28 lg:self-start">
          <SectionHeading
            eyebrow={applications.eyebrow}
            title={applications.title}
            lede={applications.lede}
          />
        </div>

        <div className="min-w-0">
          <MobileSlider>
            {applications.cards.map((card, i) => (
              <ApplicationCard key={card.title} card={card} index={i} />
            ))}
          </MobileSlider>

          <RevealGroup className="hidden gap-5 sm:grid sm:grid-cols-2" stagger={0.08}>
            {applications.cards.map((card, i) => (
              <motion.div key={card.title} variants={revealItem}>
                <ApplicationCard card={card} index={i} />
              </motion.div>
            ))}
          </RevealGroup>
        </div>
      </div>
    </Section>
  );
}
