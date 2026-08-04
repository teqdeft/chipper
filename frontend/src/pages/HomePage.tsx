import LandingIntro from '@/components/hero/LandingIntro';
import Platform from '@/components/sections/Platform';
import Library from '@/components/sections/Library';
import Organs from '@/components/sections/Organs';
import Applications from '@/components/sections/Applications';
import Workflow from '@/components/sections/Workflow';
import Materials from '@/components/sections/Materials';
import Stats from '@/components/sections/Stats';
import Featured from '@/components/sections/Featured';
import CTA from '@/components/sections/CTA';

/** SCR-001 — Public Home / landing. */
export default function HomePage() {
  return (
    <>
      <LandingIntro />
      {/*
       * Everything past the intro stage rides above the sticky chip layer, so the
       * chip slides *under* the grey Platform band instead of floating over it.
       * LandingIntro is positioned, so these need their own stacking order to win —
       * and an opaque canvas ground, since tint sections are only 50% alpha and
       * would otherwise let the chip read through.
       */}
      <div className="relative z-10 bg-canvas">
        <Platform />
        <Library />
        <Organs />
        <Applications />
        <Workflow />
        <Materials />
        <Stats />
        <Featured />
        <CTA />
      </div>
    </>
  );
}
