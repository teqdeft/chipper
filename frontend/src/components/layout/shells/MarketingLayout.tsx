import { Outlet } from 'react-router-dom';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import ScrollProgress from '@/components/ui/ScrollProgress';
import { AnimatedOutlet } from '@/components/ui/Reveal';

export default function MarketingLayout() {
  return (
    <>
      <ScrollProgress />
      <Navbar />
      <main id="main" className="min-h-screen min-w-0 bg-canvas">
        <AnimatedOutlet />
      </main>
      <Footer />
    </>
  );
}
