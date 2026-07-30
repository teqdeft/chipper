import { useEffect, useState } from 'react';
import { cn, initialsOf } from '@/lib/utils';

type AvatarProps = {
  name: string;
  src?: string | null;
  /** Sizing and text scale live here, e.g. "h-10 w-10 text-xs". */
  className?: string;
};

/**
 * Round avatar with an initials fallback.
 *
 * The fallback covers a *broken* image as well as a missing one. Without the
 * onError branch, an avatar whose file has disappeared — uploads do not survive
 * a redeploy on an ephemeral filesystem — renders as the browser's broken-image
 * box, which reads as a grey square next to everyone else's neat circle.
 *
 * Always circular: a mix of circles and rounded squares in one list looks like a
 * rendering fault rather than a distinction.
 */
export function Avatar({ name, src, className }: AvatarProps) {
  const [failed, setFailed] = useState(false);

  // A recycled list row can hand the same element a different src.
  useEffect(() => {
    setFailed(false);
  }, [src]);

  const showImage = Boolean(src) && !failed;

  return (
    <span
      className={cn(
        'flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-line bg-periwinkle-tint font-bold text-aubergine',
        className,
      )}
      aria-hidden
    >
      {showImage ? (
        <img
          src={src as string}
          alt=""
          loading="lazy"
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        initialsOf(name)
      )}
    </span>
  );
}
