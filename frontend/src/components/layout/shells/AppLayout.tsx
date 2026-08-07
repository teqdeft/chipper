import { useEffect } from 'react';
import { useMatch } from 'react-router-dom';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { AnimatedOutlet } from '@/components/ui/Reveal';
import { ZOOM_EPSILON } from '@/hooks/useVisualViewport';
import { cn } from '@/lib/utils';

/**
 * App shell — same primary nav as marketing so Forum/Designs never swap the bar.
 * Account tools live as icons + avatar on the right.
 *
 * Top spacing uses the shared --navbar-h / --page-pad-y tokens so content
 * lines up with marketing pages on mobile, tablet and desktop.
 *
 * Conversation threads on small screens go full-viewport (no footer / no
 * extra page chrome) so the composer can sit above the soft keyboard.
 */
export default function AppLayout() {
  const isChatThread = Boolean(useMatch({ path: '/messages/:id', end: true }));

  useEffect(() => {
    if (!isChatThread) return;

    const root = document.documentElement;
    root.classList.add('chat-thread-active');

    const syncVvh = () => {
      const vv = window.visualViewport;
      // While the page is zoomed, vv.height is the zoomed height (layout height
      // divided by scale). Writing that here would shrink html/body under the
      // keyboard and feed another resize, so hold the layout viewport instead.
      const zoomed = (vv?.scale ?? 1) > ZOOM_EPSILON;
      const height = !vv || zoomed ? window.innerHeight : vv.height;
      root.style.setProperty('--vvh', `${height}px`);
    };
    syncVvh();

    const vv = window.visualViewport;
    vv?.addEventListener('resize', syncVvh);
    vv?.addEventListener('scroll', syncVvh);
    window.addEventListener('resize', syncVvh);

    return () => {
      root.classList.remove('chat-thread-active');
      root.style.removeProperty('--vvh');
      vv?.removeEventListener('resize', syncVvh);
      vv?.removeEventListener('scroll', syncVvh);
      window.removeEventListener('resize', syncVvh);
    };
  }, [isChatThread]);

  return (
    <div
      className={cn(
        'bg-canvas text-aubergine',
        isChatThread ? 'max-sm:h-[var(--vvh,100dvh)] max-sm:overflow-hidden sm:min-h-screen' : 'min-h-screen',
      )}
    >
      <div className={cn(isChatThread && 'max-sm:hidden')}>
        <Navbar mode="app" />
      </div>
      <main
        id="main"
        className={cn(
          isChatThread
            ? 'max-sm:h-[var(--vvh,100dvh)] max-sm:overflow-hidden max-sm:p-0 sm:min-h-screen sm:pb-20 sm:pt-[var(--navbar-h-sm)]'
            : 'min-h-screen pb-16 pt-[var(--navbar-h)] sm:pb-20 sm:pt-[var(--navbar-h-sm)]',
        )}
      >
        <div
          className={cn(
            isChatThread
              ? 'max-sm:flex max-sm:h-full max-sm:min-h-0 max-sm:flex-col sm:pt-[var(--page-pad-y-sm)]'
              : 'page-pad-content',
          )}
        >
          <AnimatedOutlet />
        </div>
      </main>
      <div className={cn(isChatThread && 'max-sm:hidden')}>
        <Footer />
      </div>
    </div>
  );
}
