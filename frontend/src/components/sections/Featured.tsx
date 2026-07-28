import { Eyebrow } from '@/components/ui/SectionHeading';
import { Reveal } from '@/components/ui/Reveal';
import { MagneticButton } from '@/components/ui/MagneticButton';
import { featured } from '@/lib/content';
import { cn } from '@/lib/utils';

/** Flat channel diagram — the chip drawn, not photographed. */
function ChannelDiagram() {
  return (
    <svg viewBox="0 0 400 320" className="h-full w-full" role="img" aria-label="Two-channel alveolar barrier microfluidic layout">
      <defs>
        <linearGradient id="feat-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FFF3EC" />
          <stop offset="1" stopColor="#E4E6FB" />
        </linearGradient>
      </defs>
      <rect x="16" y="16" width="368" height="288" rx="20" fill="url(#feat-bg)" />

      {/* upper (coral) channel — branching */}
      <path
        d="M40 120 H120 Q150 120 165 100 Q185 74 220 74 H300 M220 74 Q255 74 275 96 H345"
        fill="none"
        stroke="#FC7147"
        strokeWidth="6"
        strokeLinecap="round"
      />
      {/* lower (periwinkle) channel — mirrored */}
      <path
        d="M40 200 H120 Q150 200 165 220 Q185 246 220 246 H300 M220 246 Q255 246 275 224 H345"
        fill="none"
        stroke="#9999DD"
        strokeWidth="6"
        strokeLinecap="round"
      />
      {/* membrane interface */}
      <line x1="120" y1="160" x2="300" y2="160" stroke="#45081F" strokeOpacity="0.25" strokeWidth="2" strokeDasharray="2 6" />

      {/* animated flow droplets */}
      <circle r="5" fill="#FC7147">
        <animateMotion dur="4s" repeatCount="indefinite" path="M40 120 H120 Q150 120 165 100 Q185 74 220 74 H345" />
      </circle>
      <circle r="5" fill="#403DD6">
        <animateMotion dur="4.6s" repeatCount="indefinite" path="M40 200 H120 Q150 200 165 220 Q185 246 220 246 H345" />
      </circle>

      {/* ports */}
      {[120, 200].map((y) => (
        <circle key={y} cx="40" cy={y} r="8" fill="#45081F" fillOpacity="0.9" />
      ))}
      {[74, 96, 224, 246].map((y, i) => (
        <circle key={i} cx="345" cy={y} r="5" fill="#45081F" fillOpacity="0.5" />
      ))}
    </svg>
  );
}

export default function Featured() {
  return (
    <section
      id="featured"
      aria-label="Featured design"
      className={cn(
        'relative overflow-hidden bg-canvas text-aubergine',
        'py-8 sm:py-14 md:py-20 lg:py-section',
        'pb-14 sm:pb-20 md:pb-24 lg:pb-28',
      )}
    >
      {/*
        Half-page color break (client feedback): aubergine band like Stats / Footer
        so the featured card isn’t floating on flat canvas before the coral CTA.
      */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 top-[36%] bg-aubergine sm:top-[40%] md:top-[44%]"
        aria-hidden
      />

      <div className="container-content relative">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4 sm:mb-12 sm:gap-6">
          <div>
            <Reveal>
              <Eyebrow>{featured.eyebrow}</Eyebrow>
            </Reveal>
            <Reveal delay={0.05}>
              <h2 className="mt-4 text-display-md font-extrabold text-aubergine sm:mt-6">
                The design that put a lab on the map.
              </h2>
            </Reveal>
          </div>
        </div>

        <Reveal delay={0.05}>
          <article className="card card-hover grid overflow-hidden lg:grid-cols-[0.95fr_1.05fr]">
            {/* Visual */}
            <div className="relative min-h-[240px] border-b border-line p-4 sm:min-h-[300px] sm:p-6 lg:border-b-0 lg:border-r">
              <ChannelDiagram />
              <span className="pill absolute left-5 top-5 bg-canvas/80 backdrop-blur sm:left-8 sm:top-8">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-green" aria-hidden />
                {featured.status}
              </span>
            </div>

            {/* Meta */}
            <div className="flex flex-col p-5 sm:p-8 md:p-10">
              <div className="flex items-center gap-3">
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-coral font-display text-sm font-bold text-aubergine"
                  aria-hidden
                >
                  B
                </span>
                <p className="text-sm text-ink-70">
                  by <span className="font-semibold text-aubergine">{featured.maker}</span>,{' '}
                  {featured.affiliation}
                  {featured.verified && (
                    <span className="ml-2 inline-flex items-center gap-1 text-green">
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-green" aria-hidden />
                      verified
                    </span>
                  )}
                </p>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2 sm:mt-5 sm:gap-3">
                <h3 className="font-display text-2xl font-extrabold text-aubergine sm:text-3xl">
                  {featured.name}
                </h3>
                <span className="pill bg-periwinkle-tint text-deep-periwinkle">{featured.version}</span>
              </div>

              <p className="mt-3 max-w-md text-base leading-relaxed text-ink-70 sm:mt-4 sm:text-[1.05rem]">
                {featured.summary}
              </p>

              <div className="mt-5 flex items-center gap-5 text-sm text-ink-55 sm:mt-6">
                <span className="inline-flex items-center gap-1.5">
                  <span className="text-coral">★</span> {featured.stars}
                </span>
                <span>Reused {featured.reuses}</span>
              </div>

              <dl className="mt-6 grid grid-cols-2 gap-x-4 gap-y-4 border-t border-line pt-5 sm:mt-8 sm:gap-x-6 sm:gap-y-5 sm:grid-cols-3 sm:pt-7">
                {featured.specs.map((s) => (
                  <div key={s.k} className="flex flex-col gap-1">
                    <dt className="eyebrow text-ink-40">{s.k}</dt>
                    <dd className="data-unit text-[0.9rem] sm:text-[0.95rem]">{s.v}</dd>
                  </div>
                ))}
              </dl>

              <div className="btn-row mt-7 sm:mt-9 sm:grid-cols-2">
                <MagneticButton href="#cta" variant="get" className="w-full">
                  Download STL
                </MagneticButton>
                <MagneticButton href="#cta" variant="ghost" className="w-full">
                  Open project
                </MagneticButton>
              </div>
            </div>
          </article>
        </Reveal>
      </div>
    </section>
  );
}
