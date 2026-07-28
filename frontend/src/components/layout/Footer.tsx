import { Logo } from '@/components/ui/Logo';
import { footer, site } from '@/lib/content';
import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="bg-aubergine text-canvas" aria-label="Footer">
      <div className="container-content py-12 sm:py-20">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_2fr] lg:gap-12">
          <div>
            <Logo className="h-7 text-canvas sm:h-8" />
            <p className="mt-5 max-w-xs text-[0.95rem] leading-relaxed text-canvas/60 sm:mt-6">
              {footer.tagline}
            </p>
            <p className="mt-6 text-sm text-canvas/50 sm:mt-8">
              {site.domain} · {site.event}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 sm:gap-8">
            {footer.columns.map((col) => (
              <nav key={col.title} aria-label={col.title}>
                <h3 className="eyebrow mb-4 text-pink sm:mb-5">{col.title}</h3>
                <ul className="flex flex-col gap-2.5 sm:gap-3">
                  {col.links.map((link) => (
                    <li key={link.href}>
                      <Link
                        to={link.href}
                        className="text-[0.95rem] text-canvas/70 transition-colors hover:text-canvas"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>
        </div>

        <div className="mt-12 flex flex-col items-start justify-between gap-4 border-t border-white/10 pt-6 text-sm text-canvas/50 sm:mt-16 sm:flex-row sm:items-center sm:pt-8">
          <p>
            © {new Date().getFullYear()} {site.name}. {footer.legal}.
          </p>
          <p className="flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-green" aria-hidden />
            Open Playground
          </p>
        </div>
      </div>
    </footer>
  );
}
