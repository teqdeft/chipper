import {
  useCallback,
  useEffect,
  useRef,
  useState,
  Children,
  type ReactNode,
} from 'react';
import { cn } from '@/lib/utils';

type MobileSliderProps = {
  children: ReactNode;
  itemClassName?: string;
  gapClassName?: string;
  className?: string;
};

/**
 * Mobile-only horizontal snap slider — native overflow scroll only.
 * Vertical page scroll stays native too (no drag hijacking).
 */
export function MobileSlider({
  children,
  itemClassName = 'basis-[calc(100%-2.5rem)]',
  gapClassName = 'gap-4',
  className,
}: MobileSliderProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState({ left: 0, width: 1 });
  const items = Children.toArray(children);

  const updateScrollbar = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    const thumbWidth = max <= 0 ? 1 : Math.max(0.28, el.clientWidth / el.scrollWidth);
    const thumbLeft = max <= 0 ? 0 : (el.scrollLeft / max) * (1 - thumbWidth);
    setProgress({ left: thumbLeft, width: thumbWidth });
  }, []);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;

    el.scrollLeft = 0;
    updateScrollbar();
    el.addEventListener('scroll', updateScrollbar, { passive: true });
    window.addEventListener('resize', updateScrollbar);

    const t = window.setTimeout(() => {
      el.scrollLeft = 0;
      updateScrollbar();
    }, 50);

    return () => {
      el.removeEventListener('scroll', updateScrollbar);
      window.removeEventListener('resize', updateScrollbar);
      window.clearTimeout(t);
    };
  }, [updateScrollbar, items.length]);

  return (
    <div className={cn('relative w-full min-w-0 sm:hidden', className)}>
      <div
        ref={scrollerRef}
        className={cn(
          'mobile-slider flex w-full min-w-0 snap-x snap-mandatory overflow-x-auto overscroll-x-contain py-1',
          gapClassName
        )}
      >
        {items.map((child, i) => (
          <div
            key={i}
            className={cn('min-w-0 shrink-0 grow-0 snap-start', itemClassName)}
          >
            {child}
          </div>
        ))}
        <div className="w-px shrink-0 basis-[2.5rem]" aria-hidden />
      </div>

      <div
        className="relative mx-auto mt-6 h-[3px] w-16 overflow-hidden rounded-full bg-line"
        aria-hidden
      >
        <div
          className="absolute inset-y-0 rounded-full bg-coral/70 transition-[left,width] duration-150 ease-out"
          style={{
            left: `${progress.left * 100}%`,
            width: `${progress.width * 100}%`,
          }}
        />
      </div>
    </div>
  );
}
