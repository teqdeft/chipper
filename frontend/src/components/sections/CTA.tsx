import { Section } from '@/components/ui/Section';
import { Reveal } from '@/components/ui/Reveal';
import { MagneticButton } from '@/components/ui/MagneticButton';
import { cta } from '@/lib/content';

export default function CTA() {
  return (
    <Section id="cta" tone="coral" ariaLabel="Join the community" className="relative overflow-hidden">
      {/* soft evolving glow */}
      <div
        className="pointer-events-none absolute -right-20 -top-20 h-[30rem] w-[30rem] rounded-full opacity-40 blur-3xl"
        style={{ background: 'radial-gradient(circle, rgba(255,187,214,0.9), transparent 65%)' }}
        aria-hidden
      />
      <div className="relative flex flex-col items-center text-center">
        <Reveal>
          <span className="eyebrow text-aubergine/70">{cta.eyebrow}</span>
        </Reveal>
        <Reveal delay={0.05}>
          <h2 className="mt-4 max-w-3xl text-display-lg font-extrabold text-aubergine sm:mt-6">
            {cta.title}
          </h2>
        </Reveal>
        <Reveal delay={0.1}>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-aubergine/80 sm:mt-6 sm:text-lg">{cta.lede}</p>
        </Reveal>
        <Reveal delay={0.15}>
          <div className="btn-row mt-8 w-full max-w-md sm:mt-10 sm:max-w-lg sm:grid-cols-2">
            <MagneticButton href={cta.primary.href} variant="primary" className="w-full">
              {cta.primary.label}
            </MagneticButton>
            <MagneticButton
              href={cta.secondary.href}
              variant="ghost"
              className="w-full !border-aubergine"
            >
              {cta.secondary.label}
            </MagneticButton>
          </div>
        </Reveal>
      </div>
    </Section>
  );
}
