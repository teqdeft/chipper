import { motion, useReducedMotion } from 'framer-motion';
import { Section } from '@/components/ui/Section';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { RevealGroup, revealItem, premiumEase } from '@/components/ui/Reveal';
import { library } from '@/lib/content';
import { cn } from '@/lib/utils';

const accentBar: Record<string, string> = {
  coral: 'bg-coral',
  periwinkle: 'bg-periwinkle',
};

export default function Library() {
  const reduced = useReducedMotion();

  return (
    <Section id="library" tone="canvas" ariaLabel="The component library">
      <div className="max-w-3xl">
        <SectionHeading eyebrow={library.eyebrow} title={library.title} lede={library.lede} />
      </div>

      <RevealGroup className="mt-7 grid gap-4 sm:mt-16 sm:grid-cols-2 sm:gap-5" stagger={0.1}>
        {library.components.map((c) => (
          <motion.div
            key={c.name}
            variants={revealItem}
            whileHover={
              reduced
                ? undefined
                : { y: -6, transition: { duration: 0.4, ease: premiumEase } }
            }
          >
            <article className="card group relative flex h-full flex-col overflow-hidden p-5 transition-[border-color,box-shadow] duration-500 ease-premium hover:border-line-strong hover:shadow-card-hover sm:p-8">
              <motion.span
                className={cn(
                  'absolute left-0 top-0 h-full w-1 origin-top',
                  accentBar[c.accent],
                )}
                initial={reduced ? false : { scaleY: 0 }}
                whileInView={{ scaleY: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.7, ease: premiumEase, delay: 0.15 }}
                aria-hidden
              />

              <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100">
                <div
                  className="absolute -right-10 -top-10 h-40 w-40 rounded-full blur-3xl"
                  style={{
                    background:
                      c.accent === 'coral'
                        ? 'rgba(252,113,71,0.18)'
                        : 'rgba(153,153,221,0.22)',
                  }}
                  aria-hidden
                />
              </div>

              <div className="relative flex items-start justify-between gap-4">
                <div>
                  <span className="pill mb-3 text-muted sm:mb-4">{c.type}</span>
                  <h3 className="font-display text-xl font-bold text-aubergine transition-colors duration-300 group-hover:text-deep-coral sm:text-2xl">
                    {c.name}
                  </h3>
                </div>
              </div>
              <p className="relative mt-3 max-w-sm text-[0.95rem] leading-relaxed text-muted">
                {c.blurb}
              </p>

              <dl className="relative mt-5 grid grid-cols-3 gap-2 border-t border-line pt-5 sm:mt-7 sm:gap-4 sm:pt-6">
                {c.specs.map((s, i) => (
                  <motion.div
                    key={s.k}
                    className="flex min-w-0 flex-col gap-1"
                    initial={reduced ? false : { opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.45, delay: 0.2 + i * 0.06, ease: premiumEase }}
                  >
                    <dt className="eyebrow text-muted">{s.k}</dt>
                    <dd className="data-unit text-[0.85rem] sm:text-[0.95rem]">{s.v}</dd>
                  </motion.div>
                ))}
              </dl>
            </article>
          </motion.div>
        ))}
      </RevealGroup>
    </Section>
  );
}
