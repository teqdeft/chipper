import { Link } from 'react-router-dom';
import { Reveal } from '@/components/ui/Reveal';

/** SCR-040 — Friendly 404. */
export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-canvas px-gutter py-16 text-center">
      <Reveal>
        <p className="eyebrow text-deep-coral">404</p>
      </Reveal>
      <Reveal delay={0.05}>
        <h1 className="mt-3 font-display text-display-md font-extrabold text-aubergine">
          This page does not exist.
        </h1>
      </Reveal>
      <Reveal delay={0.1}>
        <p className="mt-4 max-w-md text-base leading-relaxed text-muted">
          The link may be broken or the page may have moved. Head back home or browse open organ-on-chip designs.
        </p>
      </Reveal>
      <Reveal delay={0.15} className="btn-row mt-8 max-w-sm sm:grid-cols-2">
        <Link to="/" className="btn-primary">
          Go home
        </Link>
        <Link to="/designs" className="btn-ghost">
          Browse designs
        </Link>
      </Reveal>
    </div>
  );
}
