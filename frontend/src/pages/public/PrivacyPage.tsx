import { PageHeader } from '@/components/ui/app/PageHeader';
import { RevealGroup, RevealItem } from '@/components/ui/Reveal';

const sections = [
  {
    title: 'Information we collect',
    body: 'When you create an account we store your name, email address, affiliation and profile information you choose to share. When you upload a design we store the files, metadata and licence you provide. Usage logs help us keep the platform secure and reliable.',
  },
  {
    title: 'How we use your data',
    body: 'We use account data to authenticate you, display your public profile, and send service-related notifications. Design files and metadata are published according to the licence you select. We do not sell personal data to third parties.',
  },
  {
    title: 'Cookies and analytics',
    body: 'We use essential cookies for session management. Optional analytics help us understand how features are used. You can control non-essential cookies through your browser settings.',
  },
  {
    title: 'Your rights',
    body: 'You may request access to, correction of, or deletion of your personal data by contacting us. Published designs may remain archived for citation integrity even after account deletion, with personal identifiers removed where possible.',
  },
  {
    title: 'Contact',
    body: 'Questions about this policy can be sent to privacy@chipper.org. This is placeholder legal prose — a final version will be reviewed by counsel before launch.',
  },
] as const;

/** SCR-006 — Privacy policy placeholder. */
export default function PrivacyPage() {
  return (
    <div className="container-content pt-24 sm:pt-28 pb-16 sm:pb-24">
      <PageHeader
        eyebrow="Legal"
        title="Privacy policy"
        lede="How Chipper collects, uses and protects your information. Last updated: June 2026."
      />

      <RevealGroup className="mt-12 max-w-prose space-y-8 sm:mt-16" stagger={0.06}>
        {sections.map((section) => (
          <RevealItem key={section.title}>
            <section>
              <h2 className="font-display text-lg font-bold text-aubergine">{section.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-ink-70 sm:text-base">{section.body}</p>
            </section>
          </RevealItem>
        ))}
      </RevealGroup>
    </div>
  );
}
