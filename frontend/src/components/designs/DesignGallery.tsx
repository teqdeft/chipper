/**
 * SCR-018 — media panel on the design detail page.
 *
 * The hero tile advertises the 3D model but links out to the viewer screen
 * rather than rendering here, which keeps three.js (~520 KB) and the model
 * itself off this page entirely — most visitors come for the operating
 * parameters, not the geometry. Under it sits the strip of cover images the
 * uploader nominated, which is what the chip actually looks like.
 */
import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { MAX_COVER_IMAGES } from '@/lib/api/designs';
import type { DesignFile } from '@/lib/api/designs';
import { isViewableFormat } from '@/lib/modelFormats';
import { cn } from '@/lib/utils';

/** Browsers have no TIFF decoder, so those cannot go in an <img>. */
const UNDISPLAYABLE_IMAGE_TYPES = new Set(['TIF', 'TIFF']);

type Props = {
  files: DesignFile[];
  slug: string;
  /** Mock designs carry filenames with nothing stored behind them. */
  isMock?: boolean;
};

function hasUrl(file: DesignFile): file is DesignFile & { url: string } {
  return Boolean(file.url);
}

/**
 * Stand-in for a file with nothing to show — a STEP solid, a photomask, a
 * datasheet. A labelled card reads as deliberate where a broken image or an
 * empty box reads as a bug.
 */
function FileTile({ file, className }: { file: DesignFile; className?: string }) {
  return (
    <div
      className={cn(
        'group relative flex flex-col items-center justify-center gap-1 overflow-hidden',
        'bg-preview p-4 text-center',
        className,
      )}
    >
      <span className="font-display text-xl font-extrabold tracking-tight text-deep-periwinkle/70">
        {file.type || 'FILE'}
      </span>
      <span className="line-clamp-2 text-[11px] font-medium leading-tight text-muted">
        {file.name}
      </span>
      <span className="text-[10px] text-muted">{file.size}</span>
    </div>
  );
}

function ImageTile({
  file,
  onOpen,
  className,
  hero = false,
}: {
  file: DesignFile & { url: string };
  onOpen: (file: DesignFile & { url: string }) => void;
  className?: string;
  /** Hero shows the whole frame; small tiles crop to a clean square. */
  hero?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(file)}
      // Never take a `position` class from the caller — Tailwind emits
      // `.relative` after `.absolute`, so a passed-in `absolute` loses to this
      // one and any `inset-0` alongside it silently does nothing.
      className={cn('group relative block overflow-hidden bg-periwinkle-tint/40', className)}
      aria-label={`View ${file.name} full size`}
    >
      {hero ? (
        // A micrograph can be any shape. Cropping one to fill the hero throws
        // away the part that mattered, so the image is shown whole over a
        // blurred copy of itself — the frame stays full-bleed either way.
        <span
          aria-hidden
          className="absolute inset-0 scale-110 bg-cover bg-center blur-2xl saturate-150"
          style={{ backgroundImage: `url("${encodeURI(file.url)}")` }}
        />
      ) : null}
      <img
        src={file.url}
        alt={file.name}
        loading="lazy"
        className={cn(
          'relative h-full w-full transition-transform duration-500 ease-premium',
          hero ? 'object-contain p-4 group-hover:scale-[1.02]' : 'object-cover group-hover:scale-[1.04]',
        )}
      />
      <span className="pointer-events-none absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-aubergine/80 to-transparent px-2 py-1.5 text-left text-[11px] font-medium text-canvas opacity-0 transition-opacity duration-300 group-hover:opacity-100">
        {file.name}
      </span>
    </button>
  );
}

function LightboxArrow({ side, onClick }: { side: 'left' | 'right'; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={side === 'left' ? 'Previous image' : 'Next image'}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={cn(
        'absolute top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full',
        'border border-canvas/20 text-canvas transition-colors hover:border-canvas/60 hover:bg-canvas/10',
        side === 'left' ? 'left-3 sm:left-6' : 'right-3 sm:right-6',
      )}
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
        <path
          d={side === 'left' ? 'M15 5l-7 7 7 7' : 'M9 5l7 7-7 7'}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}

export default function DesignGallery({ files, slug, isMock = false }: Props) {
  const [lightbox, setLightbox] = useState<(DesignFile & { url: string }) | null>(null);

  const stored = files.filter(hasUrl);

  const model =
    stored.find((f) => f.isPrimary && isViewableFormat(f.type)) ??
    stored.find((f) => isViewableFormat(f.type)) ??
    null;

  const displayable = stored.filter(
    (f) => f.kind === 'image' && !UNDISPLAYABLE_IMAGE_TYPES.has(f.type.toUpperCase()),
  );
  // The uploader nominates up to three covers. Designs uploaded before covers
  // were required have none, so their own images stand in rather than leaving
  // an empty strip.
  const nominated = displayable.filter((f) => f.isCover);
  const images = (nominated.length ? nominated : displayable).slice(0, MAX_COVER_IMAGES);

  // Prefer a real cover photo in the hero. With a model, the cover stays visible
  // and the 3D CTA rides on top — otherwise the page only showed an empty stage.
  // Keep that same cover in the strip too so all three boxes stay filled.
  const heroImage = images[0] ?? null;
  const stripImages = images;

  // Files with no preview of their own fill whatever the covers leave, so a
  // design that ships a STEP solid and a datasheet still shows what it has.
  // The rest is left to the file list further down the page.
  const spokenFor = new Set([model?.id, ...images.map((f) => f.id)]);
  const others = files.filter((f) => !spokenFor.has(f.id));
  const tiles = [...stripImages, ...others].slice(0, MAX_COVER_IMAGES);
  const padding = tiles.length ? MAX_COVER_IMAGES - tiles.length : 0;

  // Every cover is reachable from the lightbox, whether it is the hero or a
  // thumbnail — arrows and arrow keys walk the same list.
  const gallery = images;

  const closeLightbox = useCallback(() => setLightbox(null), []);

  const step = useCallback(
    (delta: number) => {
      setLightbox((current) => {
        if (!current || gallery.length < 2) return current;
        const at = gallery.findIndex((f) => f.id === current.id);
        if (at === -1) return current;
        return gallery[(at + delta + gallery.length) % gallery.length];
      });
    },
    [gallery],
  );

  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft') step(-1);
      if (e.key === 'ArrowRight') step(1);
    };
    window.addEventListener('keydown', onKey);
    // The page behind a full-screen overlay must not scroll under it.
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [lightbox, closeLightbox, step]);

  if (!model && !images.length && !others.length) {
    return (
      <div className="card flex aspect-[16/9] items-center justify-center bg-preview sm:aspect-[2/1]">
        <p className="text-sm text-muted">No files attached to this version yet.</p>
      </div>
    );
  }

  return (
    <>
      <div className="card overflow-hidden">
        <div>
          {/* Hero — cinematic stage; shorter than a tall media slab so the
              sidebar can sit beside it without looking like a leftover strip. */}
          <div className="relative aspect-[16/9] bg-canvas sm:aspect-[2/1]">
            {model ? (
              <Link
                to={`/designs/${encodeURIComponent(slug)}/view`}
                aria-label={`Open ${model.name} in the 3D viewer`}
                className="group absolute inset-0 flex flex-col items-center justify-center overflow-hidden bg-aubergine"
              >
                {heroImage ? (
                  <>
                    <img
                      src={heroImage.url}
                      alt=""
                      loading="lazy"
                      className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-premium group-hover:scale-[1.03]"
                    />
                    <span
                      aria-hidden
                      className="absolute inset-0 bg-aubergine/45 transition-colors duration-500 group-hover:bg-aubergine/55"
                    />
                  </>
                ) : (
                  <>
                    {/* Faint build-plate grid when no cover was uploaded. */}
                    <span
                      aria-hidden
                      className="absolute inset-0 opacity-[0.18] transition-opacity duration-700 group-hover:opacity-30"
                      style={{
                        backgroundImage:
                          'linear-gradient(rgba(228,230,251,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(228,230,251,0.5) 1px, transparent 1px)',
                        backgroundSize: '32px 32px',
                        maskImage: 'radial-gradient(ellipse at center, black 18%, transparent 70%)',
                        WebkitMaskImage:
                          'radial-gradient(ellipse at center, black 18%, transparent 70%)',
                      }}
                    />
                    <span
                      aria-hidden
                      className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_45%,rgba(252,113,71,0.22),transparent_62%)]"
                    />
                  </>
                )}
                <span
                  aria-hidden
                  className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-aubergine/80 to-transparent"
                />

                <span className="relative flex h-14 w-14 items-center justify-center rounded-full border border-coral/40 bg-coral/15 transition-all duration-500 ease-premium group-hover:scale-110 group-hover:border-coral/70 group-hover:bg-coral/25 sm:h-16 sm:w-16">
                  <span
                    aria-hidden
                    className="absolute inset-0 rounded-full ring-1 ring-coral/25 transition-all duration-700 group-hover:scale-[1.35] group-hover:opacity-0"
                  />
                  <svg viewBox="0 0 24 24" className="h-5 w-5 fill-coral sm:h-6 sm:w-6" aria-hidden>
                    <path d="M12 2 3 7v10l9 5 9-5V7l-9-5Zm0 2.3 6.5 3.6L12 11.5 5.5 7.9 12 4.3ZM5 9.6l6 3.3v6.8l-6-3.3V9.6Zm8 10.1v-6.8l6-3.3v6.8l-6 3.3Z" />
                  </svg>
                </span>

                <span className="relative mt-4 font-display text-base font-bold tracking-tight text-canvas sm:mt-5 sm:text-lg">
                  Open 3D preview
                </span>
                <span className="relative mt-1 text-[11px] text-canvas/55 sm:text-xs">
                  {model.type} · {model.size}
                </span>
                <span className="relative mt-3 inline-flex items-center gap-1.5 rounded-pill border border-canvas/20 px-3 py-1 text-[10px] font-semibold uppercase tracking-eyebrow text-canvas/50 transition-colors group-hover:border-coral/50 group-hover:text-coral sm:mt-4">
                  Opens the viewer
                  <span
                    aria-hidden
                    className="transition-transform duration-500 ease-premium group-hover:translate-x-0.5"
                  >
                    →
                  </span>
                </span>
              </Link>
            ) : heroImage ? (
              <ImageTile file={heroImage} onOpen={setLightbox} className="h-full w-full" hero />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-preview">
                <p className="max-w-[16rem] px-6 text-center text-sm leading-relaxed text-muted">
                  No renderable geometry on this version — the files below are download-only.
                </p>
              </div>
            )}
          </div>

          {/* Cover strip — same covers as hero (incl. the preview image), up to 3. */}
          {tiles.length > 0 ? (
            <div className="grid grid-cols-3 gap-px border-t border-line bg-line">
              {tiles.map((file) =>
                hasUrl(file) &&
                file.kind === 'image' &&
                !UNDISPLAYABLE_IMAGE_TYPES.has(file.type.toUpperCase()) ? (
                  <ImageTile
                    key={file.id}
                    file={file}
                    onOpen={setLightbox}
                    className="aspect-[4/3]"
                  />
                ) : (
                  <FileTile key={file.id} file={file} className="aspect-[4/3]" />
                ),
              )}

              {Array.from({ length: padding }).map((_, i) => (
                <div
                  key={`empty-${i}`}
                  className="aspect-[4/3] bg-preview opacity-60"
                  aria-hidden
                />
              ))}
            </div>
          ) : null}
        </div>

        {isMock ? (
          <p className="border-t border-line px-4 py-2 text-center text-xs text-muted">
            Sample content — no stored files behind these tiles.
          </p>
        ) : null}
      </div>

      {/*
        Portalled to <body> on purpose. Reveal wraps this section in a
        framer-motion element, and a transformed ancestor makes `position:
        fixed` resolve against that ancestor instead of the viewport — the
        overlay would sit inside the card rather than over the page.
        z-index also has to clear the fixed navbar, which is z-50.
      */}
      {lightbox
        ? createPortal(
            <div
              className="fixed inset-0 z-[100] flex animate-fade-in flex-col items-center justify-center bg-aubergine/95 p-4 backdrop-blur-md sm:p-8"
              onClick={closeLightbox}
              role="dialog"
              aria-modal="true"
              aria-label={lightbox.name}
            >
              <button
                type="button"
                onClick={closeLightbox}
                aria-label="Close"
                className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-canvas/25 text-canvas transition-colors hover:border-canvas/60 hover:bg-canvas/10 sm:right-6 sm:top-6"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
                  <path
                    d="M6 6l12 12M18 6L6 18"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </button>

              {gallery.length > 1 ? (
                <>
                  <LightboxArrow side="left" onClick={() => step(-1)} />
                  <LightboxArrow side="right" onClick={() => step(1)} />
                </>
              ) : null}

              <figure
                className="flex max-h-full min-h-0 animate-zoom-in flex-col items-center"
                onClick={(e) => e.stopPropagation()}
              >
                <img
                  // Keyed so switching images restarts the transition instead
                  // of swapping the source under a static frame.
                  key={lightbox.id}
                  src={lightbox.url}
                  alt={lightbox.name}
                  // max-w matters as much as max-h: a wide panorama with only a
                  // height cap would run off both edges of the screen.
                  className="max-h-[78vh] max-w-full rounded-field object-contain shadow-lift"
                />
                <figcaption className="mt-4 shrink-0 text-center text-xs text-canvas/70">
                  <span className="font-medium text-canvas/90">{lightbox.name}</span>
                  <span className="mx-2 text-canvas/30">·</span>
                  {lightbox.size}
                  {gallery.length > 1 ? (
                    <>
                      <span className="mx-2 text-canvas/30">·</span>
                      {gallery.findIndex((f) => f.id === lightbox.id) + 1} of {gallery.length}
                    </>
                  ) : null}
                </figcaption>
              </figure>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
