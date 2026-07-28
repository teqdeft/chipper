import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/** Reset window scroll on every client-side navigation. */
export default function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    const lenis = (window as unknown as { __lenis?: { scrollTo: (y: number, opts?: object) => void } }).__lenis;
    if (lenis) {
      lenis.scrollTo(0, { immediate: true });
    } else {
      window.scrollTo(0, 0);
    }
  }, [pathname]);

  return null;
}
