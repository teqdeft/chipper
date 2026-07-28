import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/ui/app/PageHeader';
import { StatusBadge } from '@/components/ui/app/StatusBadge';
import { Reveal, RevealGroup, RevealItem } from '@/components/ui/Reveal';

const licences = [
  {
    id: 'cc',
    name: 'Creative Commons (CC BY / CC BY-SA)',
    tone: 'coral' as const,
    summary: 'Requires attribution. ShareAlike variants require derivatives to use the same licence.',
    detail:
      'CC BY 4.0 is the most common choice on Chipper. Others can copy, adapt and redistribute your design if they credit you. CC BY-SA 4.0 adds a copyleft requirement — adapted work must be shared under the same terms.',
  },
  {
    id: 'mit',
    name: 'MIT',
    tone: 'periwinkle' as const,
    summary: 'Permissive software-style licence with minimal restrictions.',
    detail:
      'MIT allows almost any use including commercial, provided the licence notice is included. Good for CAD scripts, firmware or tooling bundled with a design.',
  },
  {
    id: 'gpl',
    name: 'GPL-3.0',
    tone: 'yellow' as const,
    summary: 'Copyleft — derivatives must also be open under GPL.',
    detail:
      'GPL-3.0 ensures that modified versions stay open. Choose this when you want improvements to flow back to the community. Not ideal for designs you expect to be incorporated into closed products.',
  },
  {
    id: 'none',
    name: 'All rights reserved',
    tone: 'ink' as const,
    summary: 'No reuse without explicit permission from the rights holder.',
    detail:
      'The design may be browsed for inspection and citation, but download may be restricted. Contact the maker directly for licensing terms.',
  },
  {
    id: 'custom',
    name: 'Custom licence',
    tone: 'green' as const,
    summary: 'A licence text you provide at upload time.',
    detail:
      'Use when standard licences do not fit — e.g. academic-only use, no commercial fabrication, or attribution plus notification. Your custom text is shown on the design page.',
  },
] as const;

/** SCR-008 — Licence explainers. */
export default function LicensesPage() {
  return (
    <div className="container-content pt-24 sm:pt-28 pb-16 sm:pb-24">
      <PageHeader
        eyebrow="Licences"
        title="Choose how others can reuse your work."
        lede="Every design on Chipper declares a licence up front. Reuse should be a decision, not a risk."
      />

      <RevealGroup className="mt-12 space-y-8 sm:mt-16" stagger={0.06}>
        {licences.map((licence) => (
          <RevealItem key={licence.id}>
            <section className="border-b border-line pb-8 last:border-b-0 last:pb-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-display text-lg font-bold text-aubergine sm:text-xl">{licence.name}</h2>
                <StatusBadge tone={licence.tone}>{licence.id.toUpperCase()}</StatusBadge>
              </div>
              <p className="mt-2 text-sm font-medium text-ink-70">{licence.summary}</p>
              <p className="mt-2 max-w-prose text-sm leading-relaxed text-ink-55 sm:text-base">{licence.detail}</p>
            </section>
          </RevealItem>
        ))}
      </RevealGroup>

      <Reveal delay={0.1} className="mt-12 border-t border-line pt-10">
        <Link to="/upload" className="btn-primary">
          Upload with a licence
        </Link>
      </Reveal>
    </div>
  );
}
