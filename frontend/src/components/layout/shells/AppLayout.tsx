import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { AnimatedOutlet } from '@/components/ui/Reveal';

/**
 * App shell — same primary nav as marketing so Forum/Designs never swap the bar.
 * Account tools live as icons + avatar on the right.
 *
 * Top spacing uses the shared --navbar-h / --page-pad-y tokens so content
 * lines up with marketing pages on mobile, tablet and desktop.
 */
export default function AppLayout() {
  return (
    <div className="min-h-screen bg-canvas text-aubergine">
      <Navbar mode="app" />
      <main
        id="main"
        className="min-h-screen pb-16 pt-[var(--navbar-h)] sm:pb-20 sm:pt-[var(--navbar-h-sm)]"
      >
        <div className="page-pad-content">
          <AnimatedOutlet />
        </div>
      </main>
      <Footer />
    </div>
  );
}
