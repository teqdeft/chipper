import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/ui/app/PageHeader';
import { Reveal, RevealGroup, RevealItem } from '@/components/ui/Reveal';

/** SCR-002 — About: story, mission, partners. */
export default function AboutPage() {
  return (
    <div className="container-content pt-24 sm:pt-28 pb-16 sm:pb-24">
      <PageHeader
        eyebrow="About Chipper"
        title="Built by researchers, for researchers."
        lede="Chipper is an open platform for microphysiological systems — where every organ-on-chip design carries its maker, metadata and licence in plain sight."
      />

      <div className="mt-12 grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:gap-20 lg:mt-16">
        <Reveal delay={0.08} className="space-y-6">
          <section>
            <h2 className="font-display text-xl font-bold text-aubergine sm:text-2xl">Our story</h2>
            <p className="mt-3 text-base leading-relaxed text-ink-70">
              Organ-on-chip research moves fast, but design files often stay in lab folders or disappear when a
              student graduates. Chipper started as a simple question: what if every microfluidic design could be
              shared the way we share papers — with provenance, versioning and a licence you can actually read?
            </p>
            <p className="mt-4 text-base leading-relaxed text-ink-70">
              We built the Playground so labs can inspect a 3D preview, download an STL under a declared licence,
              and cite the maker who built it. Upload what you make; stand on what others have shared.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-bold text-aubergine sm:text-2xl">Mission</h2>
            <p className="mt-3 text-base leading-relaxed text-ink-70">
              Make organ-on-chip designs reusable, citable and trustworthy. We align metadata with ISO 22916 where
              possible, keep version history intact, and put the person behind every design at the top of the page —
              not buried in supplementary materials.
            </p>
          </section>
        </Reveal>

        <RevealGroup className="space-y-4" stagger={0.07}>
          <RevealItem>
            <div className="card p-6 sm:p-7">
              <p className="eyebrow text-deep-coral">Partners</p>
              <h3 className="mt-3 font-display text-lg font-bold text-aubergine">University of Twente</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-70">
                Home to leading MPS and soft-lithography groups. Co-developing open alveolar barrier models and
                platform metadata standards.
              </p>
            </div>
          </RevealItem>
          <RevealItem>
            <div className="card p-6 sm:p-7">
              <p className="eyebrow text-deep-coral">Partners</p>
              <h3 className="mt-3 font-display text-lg font-bold text-aubergine">TNO</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-70">
                Applied research on perfusion systems and inline sensing. Contributing designs and validation workflows
                for industrial adoption.
              </p>
            </div>
          </RevealItem>
        </RevealGroup>
      </div>

      <Reveal delay={0.12} className="mt-16 flex flex-wrap gap-3 border-t border-line pt-10">
        <Link to="/how-it-works" className="btn-primary">
          How it works
        </Link>
        <Link to="/designs" className="btn-ghost">
          Browse designs
        </Link>
      </Reveal>
    </div>
  );
}
