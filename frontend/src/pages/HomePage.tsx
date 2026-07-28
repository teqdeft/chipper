import Hero from '@/components/hero/Hero';
import About from '@/components/sections/About';
import Platform from '@/components/sections/Platform';
import Library from '@/components/sections/Library';
import Organs from '@/components/sections/Organs';
import Applications from '@/components/sections/Applications';
import Workflow from '@/components/sections/Workflow';
import Materials from '@/components/sections/Materials';
import Stats from '@/components/sections/Stats';
import Featured from '@/components/sections/Featured';
import CTA from '@/components/sections/CTA';

/** SCR-001 — Public Home / landing (unchanged composition). */
export default function HomePage() {
  return (
    <>
      <Hero />
      <About />
      <Platform />
      <Library />
      <Organs />
      <Applications />
      <Workflow />
      <Materials />
      <Stats />
      <Featured />
      <CTA />
    </>
  );
}
