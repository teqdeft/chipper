import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { motion, useInView, useReducedMotion } from 'framer-motion';
import { Section } from '@/components/ui/Section';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { MobileSlider } from '@/components/ui/MobileSlider';
import { workflow } from '@/lib/content';
import { cn } from '@/lib/utils';

const ease = [0.22, 1, 0.36, 1] as const;
const STEP_COUNT = workflow.steps.length;
const DRAW_S = 1.6;
const DRAW_DELAY_S = 0.12;

type LineBox = { left: number; top: number; width: number };

function useStepLit(inView: boolean, reduced: boolean | null, delayS: number) {
  const [lit, setLit] = useState(!!reduced);

  useEffect(() => {
    if (reduced) {
      setLit(true);
      return;
    }
    if (!inView) return;
    const t = window.setTimeout(() => setLit(true), delayS * 1000);
    return () => window.clearTimeout(t);
  }, [inView, reduced, delayS]);

  return lit;
}

function WorkflowStep({
  step,
  asCard = false,
  active = false,
  circleRef,
}: {
  step: (typeof workflow.steps)[number];
  asCard?: boolean;
  active?: boolean;
  circleRef?: (el: HTMLSpanElement | null) => void;
}) {
  return (
    <div
      className={cn(
        'flex flex-col gap-4',
        asCard && 'card h-full border-line-strong bg-canvas p-5 shadow-soft sm:p-7',
      )}
    >
      <span
        ref={circleRef}
        className={cn(
          'relative z-10 inline-flex h-14 w-14 items-center justify-center rounded-full border bg-canvas font-display text-base font-bold shadow-soft transition-[border-color,box-shadow,color] duration-500 ease-premium sm:h-16 sm:w-16 sm:text-lg',
          // No scale — keeps connector geometry stable while steps light up.
          active ? 'border-coral text-coral shadow-ring' : 'border-line text-coral',
        )}
      >
        {step.n}
      </span>
      <h3 className="font-display text-lg font-bold text-aubergine sm:text-xl">{step.title}</h3>
      <p className="text-[0.92rem] leading-relaxed text-ink-70 sm:text-[0.95rem]">{step.body}</p>
    </div>
  );
}

function DesktopStep({
  step,
  index,
  inView,
  reduced,
  circleRef,
}: {
  step: (typeof workflow.steps)[number];
  index: number;
  inView: boolean;
  reduced: boolean;
  circleRef: (el: HTMLSpanElement | null) => void;
}) {
  const delay = DRAW_DELAY_S + (index / Math.max(1, STEP_COUNT - 1)) * DRAW_S;
  const active = useStepLit(inView, reduced, delay);
  return <WorkflowStep step={step} active={active} circleRef={circleRef} />;
}

function WorkflowProgress({ play, line }: { play: boolean; line: LineBox | null }) {
  if (!line || line.width < 8) return null;

  return (
    <div
      className="pointer-events-none absolute z-0 hidden h-4 -translate-y-1/2 lg:block"
      style={{ left: line.left, top: line.top, width: line.width }}
      aria-hidden
    >
      <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-line-strong/60" />

      <motion.div
        className="absolute left-0 top-1/2 h-[2px] w-full origin-left -translate-y-1/2 rounded-full bg-coral"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: play ? 1 : 0 }}
        transition={{ duration: DRAW_S, ease, delay: DRAW_DELAY_S }}
      />

      <motion.div
        className="absolute left-0 top-1/2 h-2 w-full origin-left -translate-y-1/2 rounded-full bg-coral/30 blur-[3px]"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: play ? 1 : 0 }}
        transition={{ duration: DRAW_S, ease, delay: DRAW_DELAY_S }}
      />

      <motion.div
        className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-coral shadow-[0_0_0_4px_rgba(252,113,71,0.22)]"
        initial={{ left: '0%', opacity: 0, scale: 0.65 }}
        animate={
          play
            ? { left: '100%', opacity: 1, scale: 1 }
            : { left: '0%', opacity: 0, scale: 0.65 }
        }
        transition={{ duration: DRAW_S, ease, delay: DRAW_DELAY_S }}
      />
    </div>
  );
}

export default function Workflow() {
  const reduced = useReducedMotion();
  const stageRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const circleRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const [line, setLine] = useState<LineBox | null>(null);
  const frozenRef = useRef(false);

  const inView = useInView(stageRef, { once: true, amount: 0.35, margin: '0px 0px -8% 0px' });
  const play = !!inView && !reduced;

  const setCircleRef = useCallback(
    (index: number) => (el: HTMLSpanElement | null) => {
      circleRefs.current[index] = el;
    },
    [],
  );

  const measure = useCallback((opts?: { force?: boolean }) => {
    if (frozenRef.current && !opts?.force) return;

    const grid = gridRef.current;
    const first = circleRefs.current[0];
    const last = circleRefs.current[STEP_COUNT - 1];
    if (!grid || !first || !last) return;

    if (window.matchMedia('(max-width: 1023px)').matches) {
      setLine(null);
      frozenRef.current = false;
      return;
    }

    const g = grid.getBoundingClientRect();
    const a = first.getBoundingClientRect();
    const b = last.getBoundingClientRect();
    const ax = a.left + a.width / 2 - g.left;
    const bx = b.left + b.width / 2 - g.left;
    const ay = a.top + a.height / 2 - g.top;
    const next = {
      left: Math.min(ax, bx),
      top: ay,
      width: Math.abs(bx - ax),
    };

    if (next.width < 8) return;

    setLine(next);
    // Lock geometry so scroll / paint never nudges the connector.
    frozenRef.current = true;
  }, []);

  useLayoutEffect(() => {
    // One stable measure after first paint — no timed cascade of jumps.
    const id = requestAnimationFrame(() => measure({ force: true }));
    return () => cancelAnimationFrame(id);
  }, [measure]);

  useEffect(() => {
    const onResize = () => {
      frozenRef.current = false;
      measure({ force: true });
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [measure]);

  return (
    <Section id="workflow" tone="tint" ariaLabel="The workflow">
      <div className="min-w-0 max-w-3xl">
        <SectionHeading eyebrow={workflow.eyebrow} title={workflow.title} lede={workflow.lede} />
      </div>

      <div ref={stageRef} className="relative mt-7 min-w-0 sm:mt-16">
        <MobileSlider>
          {workflow.steps.map((step) => (
            <WorkflowStep key={step.n} step={step} asCard />
          ))}
        </MobileSlider>

        <div ref={gridRef} className="relative hidden sm:block">
          <WorkflowProgress play={play || !!reduced} line={line} />

          {/*
            Fade only (no translateY) so circle centers stay fixed and the
            connector never drifts while the section enters view.
          */}
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
            {workflow.steps.map((step, i) => (
              <motion.div
                key={step.n}
                className="relative"
                initial={reduced ? false : { opacity: 0 }}
                whileInView={reduced ? undefined : { opacity: 1 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.55, delay: i * 0.08, ease }}
              >
                <DesktopStep
                  step={step}
                  index={i}
                  inView={!!inView}
                  reduced={!!reduced}
                  circleRef={setCircleRef(i)}
                />
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </Section>
  );
}
