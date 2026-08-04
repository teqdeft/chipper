import { Link } from 'react-router-dom';
import { Logo } from '@/components/ui/Logo';
import { AnimatedOutlet } from '@/components/ui/Reveal';

export default function AuthLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-canvas text-aubergine">
      <header className="border-b border-line">
        <div className="container-content flex h-14 items-center sm:h-[68px]">
          <Link to="/" aria-label="Chipper home">
            <Logo className="h-6 text-aubergine sm:h-7" />
          </Link>
        </div>
      </header>
      <main id="main" className="flex flex-1 items-center justify-center px-gutter py-12 sm:py-16">
        <div className="w-full max-w-md">
          <AnimatedOutlet />
        </div>
      </main>
    </div>
  );
}
