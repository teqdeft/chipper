import { Link } from 'react-router-dom';
import { Logo } from '@/components/ui/Logo';
import { AnimatedOutlet } from '@/components/ui/Reveal';

export default function AuthLayout() {
  return (
    <div className="relative flex min-h-screen flex-col bg-canvas text-aubergine">
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden
        style={{
          backgroundImage: [
            'radial-gradient(80% 50% at 100% 0%, rgba(252,113,71,0.14) 0%, transparent 55%)',
            'radial-gradient(60% 40% at 0% 100%, rgba(153,153,221,0.12) 0%, transparent 50%)',
          ].join(', '),
        }}
      />
      <header className="relative z-10 border-b border-line">
        <div className="container-content flex h-14 items-center sm:h-[68px]">
          <Link to="/" aria-label="Chipper home">
            <Logo className="h-6 text-aubergine sm:h-7" />
          </Link>
        </div>
      </header>
      <main id="main" className="relative z-10 flex flex-1 items-center justify-center px-gutter py-12 sm:py-16">
        <div className="w-full max-w-md">
          <AnimatedOutlet />
        </div>
      </main>
    </div>
  );
}
