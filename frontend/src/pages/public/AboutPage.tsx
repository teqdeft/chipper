import { Link } from 'react-router-dom';
import { Reveal, RevealGroup, RevealItem } from '@/components/ui/Reveal';
import { aboutPage, site, stats } from '@/lib/content';
import { cn } from '@/lib/utils';

/** SCR-002 — About Us: editorial structure with a warmer, more attractive finish. */
export default function AboutPage() {
  return (
    <div className="pb-16 sm:pb-24">
      {/* Page intro — canvas ground only (styleguide v6, no invented washes) */}
      <header className="border-b border-line bg-canvas">
        <div className="container-content page-pad-top pb-10 sm:pb-12">
          <Reveal y={12}>
            <p className="eyebrow text-deep-coral">About us</p>
          </Reveal>
          <Reveal delay={0.05} y={18}>
            <h1 className="mt-3 max-w-2xl font-display text-display-sm font-extrabold tracking-tight text-aubergine">
              {aboutPage.title}
            </h1>
          </Reveal>
          <Reveal delay={0.1} y={14}>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-muted sm:text-[1.05rem]">
              {aboutPage.lede}
            </p>
          </Reveal>
        </div>
      </header>

      <div className="container-content">
        {/* Who we are */}
        <Reveal delay={0.06} as="section" className="mt-12 max-w-3xl sm:mt-14" aria-labelledby="about-who">
          <div className="flex items-center gap-3">
            <span className="h-8 w-1 rounded-full bg-coral" aria-hidden />
            <h2 id="about-who" className="font-display text-xl font-bold text-aubergine sm:text-2xl">
              Who we are
            </h2>
          </div>
          <div className="mt-5 space-y-4 border-l border-line pl-5 sm:pl-6">
            {aboutPage.story.paragraphs.map((p) => (
              <p key={p.slice(0, 48)} className="text-base leading-relaxed text-muted">
                {p}
              </p>
            ))}
          </div>
        </Reveal>

        {/* Mission & belief */}
        <section className="mt-12 grid gap-4 sm:mt-16 sm:grid-cols-2 sm:gap-5">
          <Reveal delay={0.04}>
            <div className="h-full rounded-card border border-line bg-surface p-6 shadow-soft sm:p-7">
              <p className="text-xs font-semibold uppercase tracking-eyebrow text-deep-coral">Mission</p>
              <h2 className="mt-3 font-display text-lg font-bold text-aubergine sm:text-xl">
                {aboutPage.mission.title}
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-muted sm:text-base">
                {aboutPage.mission.body}
              </p>
            </div>
          </Reveal>
          <Reveal delay={0.08}>
            <div className="h-full rounded-card border border-line bg-surface p-6 shadow-soft sm:p-7">
              <p className="text-xs font-semibold uppercase tracking-eyebrow text-deep-periwinkle">
                What we believe
              </p>
              <h2 className="mt-3 font-display text-lg font-bold text-aubergine sm:text-xl">
                {aboutPage.story.title}
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-muted sm:text-base">
                A reusable chip needs a maker, a licence and a record — not a forgotten zip file. Chipper exists so
                microphysiological designs can be inspected, cited and reused with the same care as a paper.
              </p>
            </div>
          </Reveal>
        </section>

        {/* Values */}
        <section className="mt-14 sm:mt-16" aria-labelledby="about-values">
          <Reveal>
            <div className="flex items-center gap-3">
              <span className="h-8 w-1 rounded-full bg-coral" aria-hidden />
              <div>
                <h2 id="about-values" className="font-display text-xl font-bold text-aubergine sm:text-2xl">
                  Our values
                </h2>
                <p className="mt-1 max-w-2xl text-sm text-muted">
                  The principles that guide how we build the platform and how the community shares work.
                </p>
              </div>
            </div>
          </Reveal>

          <RevealGroup className="mt-7 grid gap-3 sm:grid-cols-2" stagger={0.05}>
            {aboutPage.principles.map((item, i) => (
              <RevealItem key={item.n}>
                <article
                  className={cn(
                    'group h-full rounded-card border border-line bg-surface p-5 shadow-soft transition-[border-color,box-shadow,transform] duration-300 ease-premium',
                    'hover:-translate-y-0.5 hover:border-line-strong hover:shadow-card-hover sm:p-6',
                  )}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={cn(
                        'flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-display text-xs font-bold',
                        i % 2 === 0 ? 'bg-coral/15 text-deep-coral' : 'bg-periwinkle-tint text-deep-periwinkle',
                      )}
                    >
                      {item.n}
                    </span>
                    <div>
                      <h3 className="font-display text-base font-bold text-aubergine sm:text-lg">
                        {item.title}
                      </h3>
                      <p className="mt-1.5 text-sm leading-relaxed text-muted">{item.body}</p>
                    </div>
                  </div>
                </article>
              </RevealItem>
            ))}
          </RevealGroup>
        </section>

        {/* Trust */}
        <section className="mt-14 sm:mt-16" aria-labelledby="about-trust">
          <Reveal>
            <div className="flex items-center gap-3">
              <span className="h-8 w-1 rounded-full bg-coral" aria-hidden />
              <div>
                <h2 id="about-trust" className="font-display text-xl font-bold text-aubergine sm:text-2xl">
                  How we keep designs trustworthy
                </h2>
                <p className="mt-1 max-w-2xl text-sm text-muted">
                  Standards and habits that make reuse a decision, not a risk.
                </p>
              </div>
            </div>
          </Reveal>

          {/* Each block its own card on the canvas ground — surface #FFFFFF,
              1px line, radius 14. As hairline cells in one shared block they
              were canvas-on-canvas and washed out. */}
          <RevealGroup className="mt-7 grid gap-4 sm:grid-cols-2" stagger={0.05}>
            {aboutPage.standards.map((item) => (
              <RevealItem key={item.title}>
                <div className="h-full rounded-card border border-line bg-surface p-5 shadow-soft sm:p-6">
                  <h3 className="font-display text-base font-bold text-aubergine">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{item.body}</p>
                </div>
              </RevealItem>
            ))}
          </RevealGroup>
        </section>

        {/* Partners */}
        <section className="mt-14 sm:mt-16" aria-labelledby="about-partners">
          <Reveal>
            <div className="flex items-center gap-3">
              <span className="h-8 w-1 rounded-full bg-coral" aria-hidden />
              <div>
                <h2 id="about-partners" className="font-display text-xl font-bold text-aubergine sm:text-2xl">
                  Partners
                </h2>
                <p className="mt-1 max-w-2xl text-sm text-muted">
                  Research and applied partners who contribute designs, methods and metadata practice.
                </p>
              </div>
            </div>
          </Reveal>

          <RevealGroup className="mt-7 grid gap-4 lg:grid-cols-2" stagger={0.06}>
            {aboutPage.partners.map((partner) => (
              <RevealItem key={partner.name}>
                <article className="h-full rounded-card border border-line bg-surface p-6 shadow-soft sm:p-7">
                  <p className="text-xs font-semibold uppercase tracking-eyebrow text-muted">
                    {partner.role}
                  </p>
                  <h3 className="mt-2 font-display text-lg font-bold text-aubergine sm:text-xl">
                    {partner.name}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-muted">{partner.body}</p>
                  <ul className="mt-4 flex flex-wrap gap-2">
                    {partner.focus.map((tag) => (
                      <li
                        key={tag}
                        className="rounded-full bg-periwinkle-tint/60 px-2.5 py-1 text-xs font-semibold text-muted"
                      >
                        {tag}
                      </li>
                    ))}
                  </ul>
                </article>
              </RevealItem>
            ))}
          </RevealGroup>
        </section>

        {/* Snapshot */}
        <section className="mt-14 sm:mt-16" aria-labelledby="about-snapshot">
          <Reveal>
            <div className="overflow-hidden rounded-card border border-line bg-aubergine px-5 py-7 text-canvas shadow-soft sm:px-8 sm:py-9">
              <h2 id="about-snapshot" className="font-display text-xl font-bold sm:text-2xl">
                Chipper in brief
              </h2>
              <p className="mt-2 text-sm text-canvas/65">{stats.note}</p>

              <div className="mt-7 grid grid-cols-3 gap-4 border-t border-canvas/10 pt-6">
                {stats.figures.map((fig) => (
                  <div key={fig.label}>
                    <p className="font-display text-2xl font-extrabold tabular-nums text-coral sm:text-3xl">
                      {fig.value}
                      {fig.suffix}
                    </p>
                    <p className="mt-1 text-xs leading-snug text-canvas/65 sm:text-sm">{fig.label}</p>
                  </div>
                ))}
              </div>

              <dl className="mt-7 grid gap-3 border-t border-canvas/10 pt-6 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-canvas/50">Platform</dt>
                  <dd className="mt-0.5 font-medium text-canvas">
                    {site.name} · {site.domain}
                  </dd>
                </div>
                <div>
                  <dt className="text-canvas/50">Focus</dt>
                  <dd className="mt-0.5 font-medium text-canvas">
                    Microphysiological systems · organ-on-chip
                  </dd>
                </div>
                <div>
                  <dt className="text-canvas/50">What we host</dt>
                  <dd className="mt-0.5 font-medium text-canvas">
                    {aboutPage.focus.map((f) => f.label).join(', ')}
                  </dd>
                </div>
                <div>
                  <dt className="text-canvas/50">Community</dt>
                  <dd className="mt-0.5 font-medium text-canvas">Forum, news, and maker profiles</dd>
                </div>
              </dl>
            </div>
          </Reveal>
        </section>

        {/* Get involved */}
        <Reveal delay={0.08} as="section" className="mt-10 sm:mt-12">
          <div className="rounded-card border border-line bg-periwinkle-tint px-5 py-7 sm:px-8 sm:py-8">
            <h2 className="font-display text-xl font-bold text-aubergine">Get involved</h2>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted sm:text-base">
              Browse the open library, ask a question in the forum, or create an account to upload a design with its
              metadata and licence.
            </p>
            <div className="mt-6 flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap">
              <Link to="/designs" className="btn-primary">
                Browse designs
              </Link>
              <Link to="/how-it-works" className="btn-ghost">
                How it works
              </Link>
              <Link to="/forum" className="btn-ghost">
                Visit the forum
              </Link>
            </div>
          </div>
        </Reveal>
      </div>
    </div>
  );
}
