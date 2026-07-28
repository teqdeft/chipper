import { PageHeader } from '@/components/ui/app/PageHeader';
import { RevealGroup, RevealItem } from '@/components/ui/Reveal';

const sections = [
  {
    title: 'Acceptance of terms',
    body: 'By accessing or using Chipper you agree to these Terms of Service. If you do not agree, do not use the platform. These terms apply to all visitors, registered users and uploaders.',
  },
  {
    title: 'Accounts and conduct',
    body: 'You are responsible for maintaining the security of your account. You agree not to upload malicious files, infringe others’ intellectual property, or use the service to harass or mislead other users. We may suspend accounts that violate these rules.',
  },
  {
    title: 'Uploaded content and licences',
    body: 'You retain ownership of designs you upload. By publishing on Chipper you grant the platform a non-exclusive licence to host, display and distribute your content under the licence you declare. You must have the right to share everything you upload.',
  },
  {
    title: 'Downloads and reuse',
    body: 'Designs are offered under the licence stated on each entry. Chipper does not warrant fitness for a particular purpose. Users are responsible for complying with the applicable licence when downloading, adapting or citing a design.',
  },
  {
    title: 'Limitation of liability',
    body: 'Chipper is provided “as is” without warranties of any kind. To the fullest extent permitted by law, Chipper and its partners are not liable for indirect, incidental or consequential damages arising from use of the platform.',
  },
  {
    title: 'Changes',
    body: 'We may update these terms from time to time. Continued use after changes constitutes acceptance. Material changes will be announced via the news section or email where appropriate.',
  },
] as const;

/** SCR-007 — Terms of service. */
export default function TermsPage() {
  return (
    <div className="container-content pt-24 sm:pt-28 pb-16 sm:pb-24">
      <PageHeader
        eyebrow="Legal"
        title="Terms of service"
        lede="The rules for using Chipper. Last updated: June 2026."
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
