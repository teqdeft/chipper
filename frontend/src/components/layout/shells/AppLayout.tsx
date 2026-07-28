import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { AnimatedOutlet } from '@/components/ui/Reveal';

/**
 * App shell — same primary nav as marketing so Forum/Designs never swap the bar.
 * Account tools live as icons + avatar on the right.
 */
export default function AppLayout() {
  return (
    <div className="min-h-screen bg-canvas text-aubergine">
      <Navbar mode="app" />
      <main id="main" className="min-h-screen pb-16 pt-14 sm:pb-20 sm:pt-[68px]">
        <div className="pt-6 sm:pt-8">
          <AnimatedOutlet />
        </div>
      </main>
      <Footer />
    </div>
  );
}
