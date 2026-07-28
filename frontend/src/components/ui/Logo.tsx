import { cn } from '@/lib/utils';

type MarkProps = {
  className?: string;
  title?: string;
};

/**
 * Logomark — channel glyph alone.
 * Styleguide §002: favicon, app icon, social avatar, buttons —
 * anywhere the full wordmark will not fit. Recolours via currentColor.
 */
export function Logomark({ className, title }: MarkProps) {
  return (
    <svg
      viewBox="0 0 330.29 245.97"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('h-6 w-auto', className)}
      role={title ? 'img' : 'presentation'}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      {title ? <title>{title}</title> : null}
      <path
        d="M193.21,232.38h95.84c15.27,0,27.65-12.38,27.65-27.65,0-15.27-12.38-27.65-27.65-27.65H95.33c-45.14,0-81.74-36.6-81.74-81.74S50.19,13.59,95.33,13.59h125.89c15.27,0,27.65,12.38,27.65,27.65,0,15.27-12.38,27.65-27.65,27.65h-121.17c-15.27,0-27.65,12.38-27.65,27.65s12.38,27.65,27.65,27.65h185.79"
        stroke="currentColor"
        strokeWidth="27.18"
        strokeLinecap="round"
        strokeMiterlimit="10"
      />
    </svg>
  );
}

/**
 * Logo — wordmark only ("chipper" with the stepped E).
 * Styleguide §001: primary brand lockup for nav, footer, documents.
 * Min width ~120px in print; on screen we keep it readable. Recolours via currentColor.
 */
export function Logo({ className, title = 'Chipper' }: MarkProps) {
  return (
    <svg
      viewBox="0 0 666.83 172.1"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('h-7 w-auto text-aubergine sm:h-8', className)}
      role="img"
      aria-label={title}
    >
      <title>{title}</title>
      <g fill="currentColor">
        <path d="M53.19,118.12c-17.6,0-30.51-13.3-30.51-31.88s13.1-31.88,30.51-31.88c14.11,0,25.49,8.77,29.03,21.96h23.33c-4.58-24.83-25.78-42.1-52.75-42.1C22.88,34.22,0,56.71,0,86.44s22.88,52.41,52.8,52.41c27.69,0,50.17-19.69,53.44-46.05h-23.16c-2.44,14.9-14.31,25.32-29.9,25.32Z" />
        <path d="M186.1,36.18h-45.57V0h-22.3v136.9h22.3V57.3h40.68v79.6h22.29V53.58c0-10.76-6.65-17.4-17.41-17.4Z" />
        <rect x="219.07" y="36.18" width="22.3" height="100.72" />
        <rect x="219.07" width="22.3" height="28.36" />
        <path d="M311.89,34.22c-12.52,0-24.05,4.11-32.46,11.34h-22.1v126.53h22.3v-46.15c7.24,8.21,18.77,12.91,32.07,12.91,29.33,0,51.43-22.69,51.43-52.41s-21.9-52.22-51.24-52.22ZM309.35,117.93c-17.6,0-31.1-13.89-31.1-31.49s13.69-31.49,31.1-31.49,31.1,13.89,31.1,31.49-13.69,31.49-31.1,31.49Z" />
        <path d="M428.21,34.22c-12.52,0-24.05,4.11-32.46,11.34h-22.1v126.53h22.3v-46.15c7.24,8.21,18.77,12.91,32.07,12.91,29.33,0,51.43-22.69,51.43-52.41s-21.9-52.22-51.24-52.22ZM425.66,117.93c-17.6,0-31.1-13.89-31.1-31.49s13.69-31.49,31.1-31.49,31.1,13.89,31.1,31.49-13.69,31.49-31.1,31.49Z" />
        <path d="M571.78,87.03c.09,3.41-.76,7.08-2.23,10.7-6.91,17.03-23.95,24.68-40.26,18.07-6.7-2.72-11.88-7.14-15.12-12.68l77.52-32.92c-5.01-14.7-16-26.12-30.86-32.15-27.91-11.32-57.75.84-68.92,28.39-11.03,27.18,1.86,57.32,29.4,68.49,27.91,11.32,58.08-1.13,69.18-28.49,4.04-9.97,4.71-19.41,3.19-28.67l-21.91,9.26ZM513,74.8c6.84-16.85,24.13-24.61,40.26-18.07,3.44,1.4,6.67,3.34,9.05,5.78l-51.71,21.86c.2-3.09,1.08-6.31,2.41-9.57Z" />
        <path d="M606.6,36.18v100.72h22.3v-71.58c0-4.3,3.52-8.02,8.02-8.02h29.92v-21.12h-60.23Z" />
      </g>
    </svg>
  );
}
