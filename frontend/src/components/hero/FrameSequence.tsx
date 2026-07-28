import { useEffect, useRef, useState } from 'react';
import { heroScroll } from '@/lib/heroScroll';
import { useDeviceTier } from '@/hooks/useDeviceTier';

type FrameSet = { dir: string; count: number; pad: number };

const DESKTOP: FrameSet = { dir: 'desktop', count: 141, pad: 3 };
const MOBILE: FrameSet = { dir: 'mobile', count: 106, pad: 3 };

const framePath = (set: FrameSet, i: number) =>
  `/frames/${set.dir}/f-${String(i + 1).padStart(set.pad, '0')}.jpg`;

/**
 * Scroll-scrubbed film. The shared organ-on-chip footage is decoded to frames
 * and painted to a canvas, one frame per scroll position — so scrolling *is*
 * the camera move (chip floating → rotating → deep into the microchannels).
 * The whole sequence is cover-fitted and DPR-aware, with graceful loading.
 */
export default function FrameSequence({ onReady }: { onReady?: () => void }) {
  const { tier, ready } = useDeviceTier();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const imagesRef = useRef<HTMLImageElement[]>([]);
  const loadedRef = useRef<boolean[]>([]);
  const lastDrawnRef = useRef(-1);
  const rafRef = useRef(0);
  const [firstReady, setFirstReady] = useState(false);
  const [loadPct, setLoadPct] = useState(0);

  useEffect(() => {
    if (!ready) return;
    const set = tier === 'low' ? MOBILE : DESKTOP;
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    imagesRef.current = new Array(set.count);
    loadedRef.current = new Array(set.count).fill(false);
    let loadedCount = 0;
    let disposed = false;

    // Cover-fit. Mobile zooms into the chip (Apple product-hero framing).
    const draw = (index: number) => {
      const clamped = Math.max(0, Math.min(set.count - 1, index));
      let img = imagesRef.current[clamped];
      if (!img || !loadedRef.current[clamped]) {
        // fall back to the nearest already-loaded frame so we never flash blank
        let found = -1;
        for (let d = 1; d < set.count; d++) {
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
      const ir = img.width / img.height;
      const cr = cw / ch;
      let dw = cw;
      let dh = ch;
      if (ir > cr) {
        dh = ch;
        dw = ch * ir;
      } else {
        dw = cw;
        dh = cw / ir;
      }

      // Mobile: punch in on the translucent chip so it reads as the hero product.
      const zoom = tier === 'low' ? 1.42 : 1;
      dw *= zoom;
      dh *= zoom;
      // Source plates keep the chip on the right — bias crop there, slightly high.
      const biasX = tier === 'low' ? 0.88 : 0.5;
      const biasY = tier === 'low' ? 0.38 : 0.5;
      const dx = (cw - dw) * biasX;
      const dy = (ch - dh) * biasY;
      ctx.drawImage(img, dx, dy, dw, dh);
      lastDrawnRef.current = clamped;
    };

    const resize = () => {
      const rect = wrap.getBoundingClientRect();
      if (rect.width < 2 || rect.height < 2) return;
      const dpr = Math.min(window.devicePixelRatio || 1, tier === 'low' ? 1.75 : 2);
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      // force a redraw of the current frame at the new size
      const cur = lastDrawnRef.current < 0 ? 0 : lastDrawnRef.current;
      lastDrawnRef.current = -1;
      draw(cur);
    };

    // Preload — first frame gets priority so the hero paints fast.
    const loadOne = (i: number) =>
      new Promise<void>((resolve) => {
        const img = new Image();
        img.decoding = 'async';
        img.onload = () => {
          loadedRef.current[i] = true;
          imagesRef.current[i] = img;
          loadedCount += 1;
          setLoadPct(Math.round((loadedCount / set.count) * 100));
          if (i === 0 && !disposed) {
            setFirstReady(true);
            onReady?.();
            resize();
          }
          resolve();
        };
        img.onerror = () => resolve();
        img.src = framePath(set, i);
        imagesRef.current[i] = img;
      });

    // Load frame 0 first, then the rest in the background.
    loadOne(0).then(() => {
      for (let i = 1; i < set.count; i++) loadOne(i);
    });

    // Render loop — only repaints when the target frame actually changes.
    const tick = () => {
      const target = Math.round(heroScroll.progress * (set.count - 1));
      if (target !== lastDrawnRef.current) draw(target);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    // If the page first loaded in a background tab, rAF is throttled to zero:
    // resume cleanly (re-measure + repaint the current frame) once it's shown.
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        resize();
        const cur = lastDrawnRef.current < 0 ? 0 : lastDrawnRef.current;
        lastDrawnRef.current = -1;
        draw(cur);
      }
    };
    document.addEventListener('visibilitychange', onVisible);

    window.addEventListener('resize', resize);
    resize();

    return () => {
      disposed = true;
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onVisible);
      imagesRef.current = [];
      loadedRef.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, tier]);

  return (
    <div ref={wrapRef} className="absolute inset-0 h-full w-full overflow-hidden">
      <canvas
        ref={canvasRef}
        className="h-full w-full transition-opacity duration-700 ease-out"
        style={{
          opacity: firstReady ? 1 : 0,
          // Gentle warm grade so the cool footage sits inside the warm brand.
          filter: 'saturate(1.06) contrast(1.02) brightness(1.02)',
        }}
        aria-hidden
      />
      {/* subtle loading shimmer until the first frame paints */}
      {!firstReady && (
        <div className="absolute inset-0 grid place-items-center">
          <div className="h-1 w-40 overflow-hidden rounded-full bg-line">
            <div
              className="h-full rounded-full bg-coral transition-[width] duration-300"
              style={{ width: `${Math.max(8, loadPct)}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
