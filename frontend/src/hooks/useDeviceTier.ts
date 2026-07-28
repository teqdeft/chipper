import { useEffect, useState } from 'react';

export type DeviceTier = 'high' | 'low';

/**
 * Coarse quality tier for the 3D scene. Phones and pointer-coarse devices get
 * the simplified path (fewer particles, cheaper materials, lower DPR).
 * "Desktop should be immersive. Mobile should gracefully simplify."
 */
export function useDeviceTier(): { tier: DeviceTier; ready: boolean; dpr: [number, number] } {
  const [tier, setTier] = useState<DeviceTier>('high');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const coarse = window.matchMedia('(pointer: coarse)').matches;
    const narrow = window.innerWidth < 860;
    const lowCores = (navigator.hardwareConcurrency ?? 8) <= 4;
    setTier(coarse || narrow || lowCores ? 'low' : 'high');
    setReady(true);
  }, []);

  return { tier, ready, dpr: tier === 'low' ? [1, 1.5] : [1, 2] };
}
