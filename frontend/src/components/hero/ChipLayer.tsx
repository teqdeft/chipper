import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { heroScroll } from '@/lib/heroScroll';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { cn } from '@/lib/utils';

type ChipLayerProps = {
  /** Element that owns the full aubergine → coral scroll span. */
  stageRef: React.RefObject<HTMLDivElement | null>;
};

const FRAME_COUNT = 141;
const framePath = (i: number) => `/frames/chip/f-${String(i + 1).padStart(3, '0')}.png`;

/**
 * Frame progress targets (0–1 of the turntable):
 * - Hero opens near the start, then scrolls through a clear orbit
 * - About settles mid-orbit (diagonal / turned) — NOT near loop end,
 *   which reads as “seedhi” / front-on again
 */
const HERO_FRAME = 0.02; // ~frame 3 — opening pose
const ABOUT_FRAME = 0.58; // ~frame 82 — strong diagonal / side settle

/**
 * Sticky chip over the intro stage.
 * Aligned in the right content column (not flush to the viewport edge).
 * Scroll rotates frames so About receives a side-angle settle.
 */
export default function ChipLayer({ stageRef }: ChipLayerProps) {
  const reduced = useReducedMotion();
  const wrapRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imagesRef = useRef<HTMLImageElement[]>([]);
  const loadedRef = useRef<boolean[]>([]);
  const lastDrawnRef = useRef(-1);
  const rafRef = useRef(0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    imagesRef.current = new Array(FRAME_COUNT);
    loadedRef.current = new Array(FRAME_COUNT).fill(false);
    let disposed = false;

    const draw = (index: number) => {
      const clamped = Math.max(0, Math.min(FRAME_COUNT - 1, index));
      let img = imagesRef.current[clamped];
      if (!img || !loadedRef.current[clamped]) {
        let found = -1;
        for (let d = 1; d < FRAME_COUNT; d++) {
          if (loadedRef.current[clamped - d]) {
            found = clamped - d;
            break;
          }
          if (loadedRef.current[clamped + d]) {
            found = clamped + d;
            break;
          }
        }
        if (found === -1) return;
        img = imagesRef.current[found];
      }

      const cw = canvas.width;
      const ch = canvas.height;
      ctx.clearRect(0, 0, cw, ch);

      const ir = img.width / img.height;
      const cr = cw / ch;
      let dw = cw;
      let dh = ch;
      if (ir > cr) {
        dw = cw;
        dh = cw / ir;
      } else {
        dh = ch;
        dw = ch * ir;
      }
      const dx = (cw - dw) / 2;
      const dy = (ch - dh) / 2;
      ctx.drawImage(img, dx, dy, dw, dh);
      lastDrawnRef.current = clamped;
    };

    const resize = () => {
      const rect = wrap.getBoundingClientRect();
      if (rect.width < 2 || rect.height < 2) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      const cur = lastDrawnRef.current < 0 ? 0 : lastDrawnRef.current;
      lastDrawnRef.current = -1;
      draw(cur);
    };

    const loadOne = (i: number) =>
      new Promise<void>((resolve) => {
        const img = new Image();
        img.decoding = 'async';
        img.onload = () => {
          loadedRef.current[i] = true;
          imagesRef.current[i] = img;
          if (i === 0 && !disposed) {
            setReady(true);
            resize();
          }
          resolve();
        };
        img.onerror = () => resolve();
        img.src = framePath(i);
      });

    void loadOne(0).then(() => {
      for (let i = 1; i < FRAME_COUNT; i++) void loadOne(i);
    });

    const tick = () => {
      const target = Math.round(heroScroll.progress * (FRAME_COUNT - 1));
      if (target !== lastDrawnRef.current) draw(target);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    window.addEventListener('resize', resize);
    resize();

    return () => {
      disposed = true;
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', resize);
      imagesRef.current = [];
      loadedRef.current = [];
    };
  }, []);

  useEffect(() => {
    const stage = stageRef.current;
    const frame = frameRef.current;
    if (!stage || !frame) return;

    gsap.registerPlugin(ScrollTrigger);
    ScrollTrigger.config({ ignoreMobileResize: true });

    gsap.set(frame, { transformPerspective: 1400, transformOrigin: '50% 50%' });

    if (reduced) {
      heroScroll.progress = ABOUT_FRAME;
      gsap.set(frame, {
        yPercent: 0,
        scale: 1,
        xPercent: 0,
        rotateY: -16,
        rotateZ: -10,
      });
      return;
    }

    // Start on the opening pose, not frame 0 freeze after refresh mid-page.
    heroScroll.progress = HERO_FRAME;

    const mm = gsap.matchMedia();

    mm.add(
      {
        isMobile: '(max-width: 767px)',
        isDesktop: '(min-width: 768px)',
      },
      (ctx) => {
        const { isMobile } = ctx.conditions as { isMobile: boolean };

        ScrollTrigger.create({
          trigger: stage,
          start: 'top top',
          end: 'bottom bottom',
          scrub: isMobile ? 0.3 : 0.4,
          onUpdate: (self) => {
            const p = self.progress;
            // Orbit through hero → land mid-turn in About (angled, not seedhi).
            const t = gsap.utils.clamp(0, 1, p / 0.68);
            const eased = t * t * (3 - 2 * t);
            heroScroll.progress = HERO_FRAME + (ABOUT_FRAME - HERO_FRAME) * eased;
          },
        });

        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: stage,
            start: 'top top',
            end: 'bottom bottom',
            scrub: isMobile ? 0.4 : 0.55,
          },
        });

        // Hero: balanced with left copy + light yaw.
        tl.fromTo(
          frame,
          {
            yPercent: isMobile ? 2 : 0,
            scale: isMobile ? 0.96 : 1.02,
            xPercent: isMobile ? 0 : -10,
            rotateY: isMobile ? -4 : -8,
            rotateZ: isMobile ? -2 : -4,
          },
          {
            yPercent: isMobile ? -2 : 2,
            scale: isMobile ? 0.9 : 0.96,
            xPercent: isMobile ? 2 : -6,
            rotateY: isMobile ? -10 : -14,
            rotateZ: isMobile ? -6 : -8,
            ease: 'none',
            duration: 0.58,
          },
          0,
        );

        // About: more turn — frame angle + extra right yaw so it never reads flat.
        tl.to(
          frame,
          {
            yPercent: isMobile ? -8 : 8,
            scale: isMobile ? 0.84 : 0.88,
            xPercent: isMobile ? 4 : -2,
            rotateY: isMobile ? -18 : -24,
            rotateZ: isMobile ? -10 : -14,
            ease: 'none',
            duration: 0.42,
          },
          0.58,
        );

        requestAnimationFrame(() => ScrollTrigger.refresh());
      },
    );

    return () => {
      mm.revert();
    };
  }, [reduced, stageRef]);

  return (
    <div className="pointer-events-none sticky top-0 z-[1] h-0 overflow-visible" aria-hidden>
      {/* Align to content column — right half, not flush viewport edge */}
      <div className="flex h-[100dvh] min-h-[100svh] w-full items-center">
        <div className="container-content flex w-full justify-center md:justify-end">
          <div
            ref={frameRef}
            className="relative flex w-full max-w-[min(88vw,30rem)] items-center justify-center will-change-transform md:w-[min(48%,34rem)] md:max-w-[34rem] lg:w-[min(46%,36rem)] lg:max-w-[36rem]"
          >
            <div
              ref={wrapRef}
              className={cn(
                'relative aspect-square w-full transition-opacity duration-700 ease-premium',
                ready ? 'opacity-100' : 'opacity-0',
              )}
            >
              <canvas
                ref={canvasRef}
                className="h-full w-full [filter:drop-shadow(0_28px_55px_rgba(69,8,31,0.28))]"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
