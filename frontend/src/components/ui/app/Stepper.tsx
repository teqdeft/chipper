import { cn } from '@/lib/utils';

type Step = { label: string; description?: string };

export function Stepper({ steps, current }: { steps: Step[]; current: number }) {
  return (
    <ol className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-2">
      {steps.map((step, i) => {
        const active = i === current;
        const done = i < current;
        return (
          <li key={step.label} className="flex flex-1 items-start gap-3 sm:flex-col sm:gap-2">
            <div className="flex items-center gap-3 sm:w-full">
              <span
                className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                  done && 'bg-green text-canvas',
                  active && 'bg-coral text-aubergine',
                  !done && !active && 'border border-line bg-canvas text-ink-55',
                )}
              >
                {done ? '✓' : String(i + 1).padStart(2, '0')}
              </span>
              {i < steps.length - 1 ? (
                <span className="hidden h-px flex-1 bg-line sm:block" aria-hidden />
              ) : null}
            </div>
            <div>
              <p className={cn('text-sm font-semibold', active ? 'text-aubergine' : 'text-ink-70')}>{step.label}</p>
              {step.description ? <p className="mt-0.5 text-xs text-ink-55">{step.description}</p> : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
