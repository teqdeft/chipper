/**
 * A tiny module-level store shared between the GSAP ScrollTrigger that scrubs
 * the pinned hero and the R3F render loop that reads it every frame.
 * Deliberately outside React state — the 3D scene reads it in useFrame with
 * zero re-renders, which is what keeps the hero at 60fps.
 */
export const heroScroll = {
  /** 0 at the top of the hero, 1 when the explode sequence is complete. */
  progress: 0,
  /** Pointer parallax, normalised to [-1, 1]. */
  pointerX: 0,
  pointerY: 0,
};
