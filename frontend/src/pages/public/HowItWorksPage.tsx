import { Link } from 'react-router-dom';
import { Reveal, RevealGroup, RevealItem } from '@/components/ui/Reveal';
import { workflow } from '@/lib/content';
import { cn } from '@/lib/utils';

const steps = [
  {
    n: '01',
    title: 'Upload',
    body: 'Share your STL, metadata and licence. Declare organ, material, fabrication method and ISO 22916 status. Your name stays attached to every version.',
    points: ['3D model + metadata', 'Licence declared up front', 'Maker provenance kept'],
    accent: 'coral' as const,
  },
  {
    n: '02',
    title: 'Download',
    body: 'Browse the library, inspect the 3D preview, read the licence and download under the terms the maker chose. Citation details are one click away.',
    points: ['Inspect before download', 'Clear reuse terms', 'Cite maker & version'],
    accent: 'periwinkle' as const,
  },
  {
    n: '03',
    title: 'Community',
    body: 'Ask questions in the forum, message makers directly, and get notified when a design you follow updates. Reuse is a conversation, not a black box.',
    points: ['Forum discussions', 'Direct messages', 'Follow updates'],
    accent: 'coral' as const,
  },
] as const;

const extras = [
  {
    title: 'What you bring',
    items: [
      'A design file (STL or related formats)',
      'Organ, material and fabrication details',
      'A licence you are happy for others to follow',
      'ISO 22916 status when it applies',
    ],
  },
  {
    title: 'What you get',
    items: [
      'A public page with maker, version and citation',
      'A 3D preview others can inspect first',
      'Version history that stays downloadable',
      'A place for questions and collaboration',
    ],
  },
] as const;

/** SCR-003 — How it works: upload, download, community — clearer and warmer. */
export default function HowItWorksPage() {
  return (
    <div className="pb-16 sm:pb-24">
      <header className="border-b border-line bg-canvas">
        <div className="container-content page-pad-top pb-10 sm:pb-12">
          <Reveal y={12}>
            <p className="eyebrow text-deep-coral">How it works</p>
          </Reveal>
          <Reveal delay={0.05} y={18}>
            <h1 className="mt-3 max-w-2xl font-display text-display-sm font-extrabold tracking-tight text-aubergine">
              Three steps, one open loop.
            </h1>
          </Reveal>
          <Reveal delay={0.1} y={14}>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-muted sm:text-[1.05rem]">
              The platform is built around what researchers actually do with a design — share it, find it, and talk
              about it.
            </p>
          </Reveal>
        </div>
      </header>

      <div className="container-content">
        {/* Main steps */}
        <section className="mt-12 sm:mt-14" aria-labelledby="hiw-steps">
          <Reveal>
            <div className="flex items-center gap-3">
              <span className="h-8 w-1 rounded-full bg-coral" aria-hidden />
              <div>
                <h2 id="hiw-steps" className="font-display text-xl font-bold text-aubergine sm:text-2xl">
                  The open loop
                </h2>
                <p className="mt-1 text-sm text-muted">Upload → download → community — then publish again.</p>
              </div>
            </div>
          </Reveal>

          <RevealGroup className="mt-7 grid gap-4 lg:grid-cols-3" stagger={0.07}>
            {steps.map((step, i) => (
              <RevealItem key={step.n}>
                <article
                  className={cn(
                    'flex h-full flex-col rounded-card border border-line bg-surface p-6 shadow-soft transition-[border-color,box-shadow,transform] duration-300 ease-premium',
                    'hover:-translate-y-0.5 hover:border-line-strong hover:shadow-card-hover sm:p-7',
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={cn(
                        'flex h-11 w-11 items-center justify-center rounded-full font-display text-sm font-bold shadow-soft',
                        step.accent === 'coral'
                          ? 'bg-coral/15 text-deep-coral ring-1 ring-coral/30'
                          : 'bg-periwinkle-tint text-deep-periwinkle ring-1 ring-periwinkle/40',
                      )}
                    >
                      {step.n}
                    </span>
                    {i < steps.length - 1 ? (
                      <span className="hidden text-xs font-semibold uppercase tracking-eyebrow text-muted lg:inline">
                        Next →
                      </span>
                    ) : null}
                  </div>

                  <h3 className="mt-5 font-display text-xl font-bold text-aubergine">{step.title}</h3>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-muted sm:text-base">{step.body}</p>

                  <ul className="mt-5 space-y-2 border-t border-line pt-4">
                    {step.points.map((point) => (
                      <li key={point} className="flex items-start gap-2 text-sm text-muted">
                        <span
                          className={cn(
                            'mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full',
                            step.accent === 'coral' ? 'bg-coral' : 'bg-periwinkle',
                          )}
                          aria-hidden
                        />
                        {point}
                      </li>
                    ))}
                  </ul>
                </article>
              </RevealItem>
            ))}
          </RevealGroup>
        </section>

        {/* Detail loop — inspect / cite / reuse / publish */}
        <section className="mt-14 sm:mt-16" aria-labelledby="hiw-detail">
          <Reveal>
            <div className="flex items-center gap-3">
              <span className="h-8 w-1 rounded-full bg-coral" aria-hidden />
              <div>
                <h2 id="hiw-detail" className="font-display text-xl font-bold text-aubergine sm:text-2xl">
                  Inside every design
                </h2>
                <p className="mt-1 max-w-2xl text-sm text-muted">{workflow.lede}</p>
              </div>
            </div>
          </Reveal>

          <RevealGroup
            className="mt-7 grid gap-px overflow-hidden rounded-card border border-line bg-line shadow-soft sm:grid-cols-2 lg:grid-cols-4"
            stagger={0.05}
          >
            {workflow.steps.map((step) => (
              <RevealItem key={step.n}>
                <div className="h-full bg-surface p-5 sm:p-6">
                  <span className="font-display text-sm font-bold text-deep-coral">{step.n}</span>
                  <h3 className="mt-2 font-display text-base font-bold text-aubergine sm:text-lg">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{step.body}</p>
                </div>
              </RevealItem>
            ))}
          </RevealGroup>
        </section>

        {/* Bring / get */}
        <section className="mt-14 grid gap-4 sm:mt-16 sm:grid-cols-2 sm:gap-5">
          {extras.map((block, i) => (
            <Reveal key={block.title} delay={0.04 + i * 0.04}>
              <div className="h-full rounded-card border border-line bg-surface p-6 shadow-soft sm:p-7">
                <p
                  className={cn(
                    'text-xs font-semibold uppercase tracking-eyebrow',
                    i === 0 ? 'text-deep-coral' : 'text-deep-periwinkle',
                  )}
                >
                  {block.title}
                </p>
                <ul className="mt-4 space-y-3">
                  {block.items.map((item) => (
                    <li key={item} className="flex items-start gap-2.5 text-sm leading-relaxed text-muted">
                      <span
                        className={cn(
                          'mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full',
                          i === 0 ? 'bg-coral' : 'bg-periwinkle',
                        )}
                        aria-hidden
                      />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          ))}
        </section>

        {/* CTA */}
        <Reveal delay={0.1} className="mt-12 sm:mt-14">
          <div className="rounded-card border border-line bg-periwinkle-tint px-5 py-8 text-center sm:px-10 sm:py-10">
            <p className="eyebrow text-deep-periwinkle">Ready to start?</p>
            <h2 className="mt-3 font-display text-display-sm font-extrabold text-aubergine">
              Join the Playground.
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted sm:text-base">
              Create a free account to upload designs, download files and take part in the forum.
            </p>
            <div className="btn-row mx-auto mt-8 max-w-md sm:grid-cols-2">
              <Link to="/register" className="btn-primary">
                Create account
              </Link>
              <Link to="/designs" className="btn-ghost">
                Browse designs
              </Link>
            </div>
          </div>
        </Reveal>
      </div>
    </div>
  );
}
