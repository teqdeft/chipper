import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/ui/app/PageHeader';
import { Reveal, RevealGroup, RevealItem } from '@/components/ui/Reveal';

const steps = [
  {
    n: '01',
    title: 'Upload',
    body: 'Share your STL, metadata and licence. Declare organ, material, fabrication method and ISO 22916 status. Your name stays attached to every version.',
  },
  {
    n: '02',
    title: 'Download',
    body: 'Browse the library, inspect the 3D preview, read the licence and download under the terms the maker chose. Citation details are one click away.',
  },
  {
    n: '03',
    title: 'Community',
    body: 'Ask questions in the forum, message makers directly, and get notified when a design you follow updates. Reuse is a conversation, not a black box.',
  },
] as const;

/** SCR-003 — How it works: upload, download, community. */
export default function HowItWorksPage() {
  return (
    <div className="container-content pt-24 sm:pt-28 pb-16 sm:pb-24">
      <PageHeader
        eyebrow="How it works"
        title="Three steps, one open loop."
        lede="The platform is built around what researchers actually do with a design — share it, find it, and talk about it."
      />

      <RevealGroup
        className="mt-12 space-y-10 sm:mt-16 lg:space-y-0 lg:grid lg:grid-cols-3 lg:gap-8"
        stagger={0.07}
      >
        {steps.map((step) => (
          <RevealItem key={step.n} as="li" className="relative list-none">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-coral bg-canvas font-display text-sm font-bold text-coral shadow-soft">
              {step.n}
            </span>
            <h2 className="mt-4 font-display text-xl font-bold text-aubergine">{step.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-70 sm:text-base">{step.body}</p>
          </RevealItem>
        ))}
      </RevealGroup>

      <Reveal delay={0.12} className="mt-16 rounded-[16px] border border-line bg-periwinkle-tint/40 px-6 py-10 text-center sm:px-10 sm:py-12">
        <p className="eyebrow text-deep-periwinkle">Ready to start?</p>
        <h2 className="mt-3 font-display text-display-sm font-extrabold text-aubergine">Join the Playground.</h2>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-ink-70 sm:text-base">
          Create a free account to upload designs, download files and participate in the forum.
        </p>
        <div className="btn-row mx-auto mt-8 max-w-md sm:grid-cols-2">
          <Link to="/register" className="btn-primary">
            Create account
          </Link>
          <Link to="/designs" className="btn-ghost">
            Browse designs
          </Link>
        </div>
      </Reveal>
    </div>
  );
}
