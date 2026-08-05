import { Section } from '@/components/ui/Section';
import { about } from '@/lib/content';

/**
 * Coral band — chip lands here after the aubergine → coral blend.
 * Right column stays open as a quiet product stage.
 *
 * No whileInView reveals here: on the first Hero → About scroll those
 * staggered fades were fighting Lenis and made the *page* feel glittery.
 * Second pass felt fine only because the animations had already finished.
 */
export default function About() {
  return (
    <Section
      id="about"
      tone="canvas"
      ariaLabel="What is an organ-on-a-chip"
      className="relative min-h-[100svh] !bg-transparent pb-24 pt-10 text-aubergine sm:pb-28 sm:pt-16 md:min-h-[110vh] md:pb-36"
    >
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)] lg:items-center lg:gap-16 xl:gap-20">
        <div className="relative max-w-xl">
          <span className="eyebrow inline-flex items-center gap-2 text-aubergine">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-aubergine" aria-hidden />
            {about.eyebrow}
          </span>
          <h2 className="mt-4 text-display-md font-extrabold text-aubergine sm:mt-6">
            {about.title}
          </h2>
          <div className="mt-6 space-y-4 sm:mt-8 sm:space-y-5">
            {about.body.map((p, i) => (
              <p key={i} className="max-w-prose text-base leading-relaxed text-aubergine/80 sm:text-lg">
                {p}
              </p>
            ))}
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:mt-10 sm:gap-3.5">
            {about.points.map((point) => (
              <div
                key={point.k}
                className="rounded-card border border-aubergine/10 bg-surface/85 p-5 shadow-soft sm:p-6"
              >
                <div className="flex items-baseline gap-3 sm:gap-4">
                  <span className="font-display text-sm font-bold text-aubergine/35">·</span>
                  <div>
                    <h3 className="font-display text-lg font-bold text-aubergine">{point.k}</h3>
                    <p className="mt-1.5 text-[0.95rem] leading-relaxed text-aubergine/70">{point.v}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quiet landing pad — chip settles here as the colour blend finishes */}
        <div className="relative hidden min-h-[32rem] lg:block xl:min-h-[36rem]" aria-hidden />
      </div>
    </Section>
  );
}
