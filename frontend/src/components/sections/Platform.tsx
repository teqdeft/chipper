import { motion } from 'framer-motion';
import { Section } from '@/components/ui/Section';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { RevealGroup, revealItem } from '@/components/ui/Reveal';
import { platform } from '@/lib/content';
import { cn } from '@/lib/utils';

const accentDot: Record<string, string> = {
  coral: 'bg-coral',
  periwinkle: 'bg-periwinkle',
  pink: 'bg-pink',
};

export default function Platform() {
  return (
    <Section id="platform" tone="tint" ariaLabel="The platform">
      <div className="max-w-3xl">
        <SectionHeading eyebrow={platform.eyebrow} title={platform.title} lede={platform.lede} />
      </div>

      <RevealGroup
        className="mt-7 grid gap-4 sm:mt-16 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3"
        stagger={0.06}
      >
        {platform.features.map((f) => (
          <motion.div key={f.title} variants={revealItem}>
            <article className="card card-hover group flex h-full flex-col gap-3 bg-canvas p-5 sm:gap-4 sm:p-7">
              <span
                className={cn(
                  'inline-flex h-8 w-8 items-center justify-center rounded-full transition-transform duration-500 ease-premium group-hover:scale-110',
                  'ring-1 ring-line'
                )}
                aria-hidden
              >
                <span className={cn('h-2.5 w-2.5 rounded-full', accentDot[f.accent])} />
              </span>
              <h3 className="font-display text-xl font-bold text-aubergine">{f.title}</h3>
              <p className="text-[0.95rem] leading-relaxed text-ink-70">{f.body}</p>
            </article>
          </motion.div>
        ))}
      </RevealGroup>
    </Section>
  );
}
