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

const FRAME_COUNT = 120;
const framePath = (i: number) => `/frames/chip/f-${String(i + 1).padStart(3, '0')}.webp`;

/**
 * Split the turntable across Hero vs About so About still has a full
 * continuing orbit — Hero used to burn almost every frame before About
 * started, which felt like a mid-section freeze.
 */
const HERO_FRAME = 0.02;
const ABOUT_START_FRAME = 0.32; // enter About mid-orbit
const EXIT_FRAME = 1; // last plate — keep turning until the chip leaves

/**
 * Light ease only — heavy smoothing + high scrub stacked lag so the chip
 * kept drifting after the wheel stopped.
 */
const FRAME_SMOOTHING = 0.35;

/**
 * Sticky chip over the intro stage.
 * Aligned in the right content column (not flush to the viewport edge).
 * Scroll rotates frames through Hero + full About until exit.
 */
export default function ChipLayer({ stageRef }: ChipLayerProps) {
  const reduced = useReducedMotion();
  const wrapRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imagesRef = useRef<HTMLImageElement[]>([]);
  const loadedRef = useRef<boolean[]>([]);
  const displayProgressRef = useRef(HERO_FRAME);
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

    /**
     * One frame only — alpha-crossfading transparent plates caused scroll blink.
     * Progress is smoothed in `tick`, then we paint the nearest loaded frame.
     */
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

      // Same plate already on screen — skip clear/draw (avoids flicker).
      if (clamped === lastDrawnRef.current && loadedRef.current[clamped]) return;

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
      ctx.globalAlpha = 1;
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

    let lastTime = performance.now();
    const tick = (now: number) => {
      // Frame-rate independent damping so 60/120Hz both feel equally silky.
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;
      const alpha = 1 - Math.pow(1 - FRAME_SMOOTHING, dt * 60);
      const target = heroScroll.progress;
      const cur = displayProgressRef.current;
      const next = cur + (target - cur) * alpha;
      displayProgressRef.current = Math.abs(target - next) < 0.00008 ? target : next;
      draw(Math.round(displayProgressRef.current * (FRAME_COUNT - 1)));
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
      heroScroll.progress = ABOUT_START_FRAME;
      displayProgressRef.current = ABOUT_START_FRAME;
      gsap.set(frame, {
        yPercent: 0,
        scale: 1,
        xPercent: 0,
        rotateY: -8,
        rotateZ: 0,
      });
      return;
    }

    heroScroll.progress = HERO_FRAME;
    displayProgressRef.current = HERO_FRAME;

    const mm = gsap.matchMedia();

    mm.add(
      {
        isMobile: '(max-width: 767px)',
        isDesktop: '(min-width: 768px)',
      },
      (ctx) => {
        const { isMobile } = ctx.conditions as { isMobile: boolean };
        // Low scrub = tight to the wheel; stop scrolling → chip stops with it.
        const scrub = isMobile ? 0.25 : 0.35;

        // Hero band: first stretch of the turntable (ends as About enters).
        ScrollTrigger.create({
          trigger: '#hero',
          start: 'top top',
          end: 'bottom bottom',
          scrub,
          onUpdate: (self) => {
            heroScroll.progress = gsap.utils.interpolate(HERO_FRAME, ABOUT_START_FRAME, self.progress);
          },
        });

        // About → stage exit: remaining plates play through to the last frame
        // before the chip slides under Platform. No overlap with the hero ST.
        ScrollTrigger.create({
          trigger: '#about',
          start: 'top bottom',
          endTrigger: stage,
          end: 'bottom bottom',
          scrub,
          onUpdate: (self) => {
            heroScroll.progress = gsap.utils.interpolate(ABOUT_START_FRAME, EXIT_FRAME, self.progress);
          },
        });

        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: stage,
            start: 'top top',
            end: 'bottom bottom',
            scrub,
          },
        });

        // rotateZ stays 0 — any roll lifts the right edge off the X-axis.
        tl.fromTo(
          frame,
          {
            yPercent: isMobile ? 2 : 0,
            scale: 1,
            xPercent: isMobile ? 0 : 4,
            rotateY: isMobile ? -2 : -4,
            rotateZ: 0,
          },
          {
            yPercent: isMobile ? -2 : 2,
            scale: isMobile ? 0.94 : 0.96,
            xPercent: isMobile ? 2 : 5,
            rotateY: isMobile ? -8 : -10,
            rotateZ: 0,
            ease: 'none',
            duration: 0.55,
          },
          0,
        );

        // About → exit: stay level on X; only mild yaw + scale as it leaves.
        tl.to(
          frame,
          {
            yPercent: isMobile ? -6 : 6,
            scale: isMobile ? 0.84 : 0.88,
            xPercent: isMobile ? 2 : 6,
            rotateY: isMobile ? -12 : -14,
            rotateZ: 0,
            ease: 'none',
            duration: 0.45,
          },
          0.55,
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
      {/*
       * Clip X on this viewport band (not an ancestor of sticky) so GSAP
       * scale/rotate + drop-shadow can't widen the document and leave a
       * white strip beside the aubergine stage.
       */}
      <div className="flex h-[100dvh] min-h-[100svh] w-full max-w-[100%] items-center overflow-x-clip">
        <div className="container-content flex w-full min-w-0 justify-center md:justify-end">
          <div
            ref={frameRef}
            className="relative flex w-full max-w-[min(94vw,34rem)] items-center justify-center will-change-transform md:w-[min(48%,32rem)] md:max-w-[32rem] lg:w-[min(52%,37rem)] lg:max-w-[37rem] xl:w-[min(58%,42rem)] xl:max-w-[42rem]"
          >
            <div
              ref={wrapRef}
              className={cn(
                'relative aspect-[29/16] w-full transition-opacity duration-700 ease-premium',
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
