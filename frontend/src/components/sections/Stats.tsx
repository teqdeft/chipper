import { Section } from '@/components/ui/Section';
import { Eyebrow } from '@/components/ui/SectionHeading';
import { Reveal } from '@/components/ui/Reveal';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { stats } from '@/lib/content';

export default function Stats() {
  return (
    <Section id="community" tone="aubergine" ariaLabel="Built by the community">
      <div className="grid gap-8 lg:grid-cols-[1fr_1fr] lg:items-end lg:gap-20">
        <div>
          <Reveal>
            <Eyebrow className="text-pink">{stats.eyebrow}</Eyebrow>
          </Reveal>
          <Reveal delay={0.05}>
            <h2 className="mt-4 text-display-md font-extrabold text-canvas sm:mt-6">{stats.title}</h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="mt-4 max-w-prose text-base leading-relaxed text-canvas/70 sm:mt-6 sm:text-lg">{stats.lede}</p>
          </Reveal>
        </div>

        <div className="grid grid-cols-1 gap-px overflow-hidden rounded-[16px] border border-white/10 bg-white/10 sm:grid-cols-3 sm:rounded-card">
          {stats.figures.map((fig) => (
            <div key={fig.label} className="bg-aubergine p-6 sm:p-8">
              <div className="font-display text-5xl font-extrabold leading-none text-coral sm:text-6xl">
                <AnimatedNumber
                  value={fig.value}
                  suffix={fig.suffix}
                  decimals={fig.suffix === 'k' ? 1 : 0}
                />
              </div>
              <p className="mt-3 text-sm leading-snug text-canvas/70 sm:mt-4">{fig.label}</p>
            </div>
          ))}
        </div>
      </div>

      <Reveal delay={0.1}>
        <p className="mt-8 flex items-center gap-3 text-sm text-canvas/55 sm:mt-14">
          <span className="inline-block h-2 w-2 rounded-full bg-green" aria-hidden />
          {stats.note}
        </p>
      </Reveal>
    </Section>
  );
}
