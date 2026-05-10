/**
 * Inline SVG Logo Components
 *
 * These components render SVG paths directly in JSX (no <img> tag, no public folder).
 * All paths use fill="currentColor" so they respond to CSS `color` / Tailwind text-* classes.
 *
 * Source assets: packages/design/brand/assets/logo/
 *
 * Usage:
 *   <LogomarkSVG className="text-white w-8 h-8" />
 *   <WordmarkEnSVG className="text-white" width={150} />
 *   <LogoEnSVG className="text-white" width={160} />
 */

interface SVGProps {
  className?: string;
  width?: number;
  height?: number;
  "aria-label"?: string;
}

// ─── Logomark (hexagonal N icon) ──────────────────────────────────────────────
// Source: assets/logo/logo-inverse.svg  viewBox="0 0 535.71 500"

const LOGOMARK_PATH =
  "M518.13,184.13c-12.15-21.05-29.76-37.95-50.42-49.37c0.53-23.73-5.29-47.58-17.52-68.75l-0.14-0.25" +
  "c-22.88-39.63-65.11-64.6-110.74-65.72C338.93,0.02,338.55,0,338.17,0h-1.77h-0.25H199.87c-46.89,0-90.58,25.23-114.02,65.83" +
  "L17.58,184.07c-23.45,40.61-23.45,91.06,0,131.66C29.74,336.78,47.34,353.69,68,365.1c-0.56,23.78,5.28,47.68,17.53,68.91l0.13,0.22" +
  "c23.37,40.48,66.92,65.68,113.66,65.77c0.09,0,0.17,0,0.26,0c1.86,0,3.71-0.05,5.56-0.13h130.7c46.89,0,90.58-25.23,114.02-65.83" +
  "l68.26-118.24C541.58,275.19,541.58,224.74,518.13,184.13z M279.32,473.01c13.65-10.39,25.34-23.48,34.17-38.76l102.56-177.57" +
  "l34.14-59.1c6.16-10.67,10.69-22.03,13.61-33.7c12.53,8.68,23.24,20.09,31.08,33.68c18.66,32.33,18.66,72.49,0,104.81l-68.26,118.24" +
  "c-18.66,32.33-53.44,52.41-90.77,52.41H279.32z M108.77,420.56c-7.92-13.72-12.46-28.85-13.65-44.2c-0.24-3.1-0.34-6.22-0.31-9.33" +
  "c8.79,8.47,20.26,13.61,32.79,14.47c1.24,0.09,2.5,0.13,3.76,0.13h75.97l60.51-104.81l18.47,31.99l4.01,6.95" +
  "c1.21,2.09,2.54,4.08,3.98,5.95c2.87,3.73,6.17,7.01,9.82,9.79c8.89,6.78,19.83,10.58,31.54,10.68l-45.42,78.64" +
  "c-14.76,25.56-39.6,43.43-67.81,49.78c-5.54,1.25-11.21,2.05-16.97,2.37c-1.95,0.11-3.91,0.18-5.88,0.18c-0.07,0-0.14,0-0.21,0" +
  "c-3.13-0.01-6.24-0.17-9.33-0.45c-33.59-3.1-64.1-22.39-81.14-51.92L108.77,420.56z M199.87,26.85h56.7" +
  "c-13.72,10.41-25.48,23.55-34.35,38.9l-67.45,116.78c-0.34,0.54-0.67,1.09-0.99,1.64L85.57,302.33c-0.35,0.61-0.68,1.22-1.01,1.83" +
  "c-5.65,10.13-9.85,20.84-12.62,31.85c-12.55-8.68-23.26-20.1-31.11-33.7c-18.66-32.33-18.66-72.49,0-104.81L109.1,79.26" +
  "C127.77,46.93,162.55,26.85,199.87,26.85z M426.94,79.44c7.9,13.68,12.44,28.77,13.64,44.06c0.25,3.14,0.36,6.29,0.32,9.44" +
  "c-9.22-8.91-21.4-14.14-34.65-14.6c-0.64-0.02-1.29-0.04-1.93-0.04h-0.21h-75.76l-60.51,104.81l-18.46-31.98l-4.02-6.96" +
  "c-1.21-2.09-2.54-4.08-3.98-5.95c-2.87-3.73-6.17-7.01-9.82-9.8c-8.87-6.76-19.78-10.57-31.46-10.68l45.38-78.57" +
  "c14.75-25.54,39.55-43.4,67.72-49.76c5.54-1.25,11.22-2.06,16.97-2.39c1.98-0.11,3.97-0.18,5.96-0.18c0.07,0,0.13,0,0.2,0" +
  "c3.11,0.01,6.19,0.16,9.25,0.44c33.62,3.08,64.16,22.38,81.2,51.9L426.94,79.44z";

export function LogomarkSVG({
  className,
  width = 32,
  height = 32,
  "aria-label": ariaLabel,
}: SVGProps) {
  if (ariaLabel) {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 535.71 500"
        width={width}
        height={height}
        className={className}
        aria-label={ariaLabel}
        role="img"
        fill="currentColor"
      >
        <path d={LOGOMARK_PATH} />
      </svg>
    );
  }
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 535.71 500"
      width={width}
      height={height}
      className={className}
      aria-hidden="true"
      role="img"
      fill="currentColor"
    >
      <path d={LOGOMARK_PATH} />
    </svg>
  );
}

// ─── English Wordmark ("Nebutra" text) ────────────────────────────────────────
// Source: assets/logo/logo-en.svg  viewBox="0 0 544.21 103.74"

function WordmarkPaths() {
  return (
    <>
      {/* N */}
      <path
        d="M78.69,102.73H67.76c-3.87,0-7.47-1.96-9.56-5.21L18.27,35.5v55.86c0,6.28-5.09,11.37-11.37,11.37H0V0h10.93
        c3.87,0,7.47,1.96,9.56,5.21l39.94,62.01V11.37C60.43,5.09,65.52,0,71.8,0h6.89V102.73z"
      />
      {/* E */}
      <rect x="102.92" y="53.18" width="66.72" height="18.27" />
      <path
        d="M147.44,80.28c-4.3,3.7-10.07,5.73-16.31,5.07c-9.76-1.04-17.69-8.78-18.93-18.52
        c-1.78-14.01,10.06-25.86,24.08-24.06c9.61,1.23,17.29,8.97,18.47,18.58c0.44,3.58-0.02,7-1.16,10.1h18.89
        c0.46-2.41,0.71-4.88,0.71-7.42c0-22.91-19.49-41.34-42.76-39.6C111,25.89,95.33,41.56,93.87,60.98
        c-1.75,23.27,16.69,42.76,39.6,42.76c14.91,0,27.92-8.26,34.71-20.45l-7.81-4.33C156.21,76.65,151.05,77.18,147.44,80.28z"
      />
      {/* I */}
      <path d="M205.06,102.73h-6.89c-6.28,0-11.37-5.09-11.37-11.37V0h6.89c6.28,0,11.37,5.09,11.37,11.37V102.73z" />
      {/* O */}
      <path
        d="M226.5,103.74c-21.9,0-39.71-17.81-39.71-39.71s17.81-39.71,39.71-39.71s39.71,17.81,39.71,39.71
        S248.4,103.74,226.5,103.74z M226.5,42.58c-11.83,0-21.45,9.62-21.45,21.45c0,11.83,9.62,21.45,21.45,21.45
        c11.82,0,21.45-9.62,21.45-21.45C247.95,52.2,238.33,42.58,226.5,42.58z"
      />
      {/* U */}
      <path
        d="M315.89,103.74c-19.34,0.33-35.17-15.84-35.17-35.18V24.32h6.89c6.28,0,11.37,5.09,11.37,11.37v33.08
        c0,8.83,6.85,16.36,15.68,16.7c9.28,0.35,16.94-7.09,16.94-16.29V35.69c0-6.28,5.09-11.37,11.37-11.37h6.89v44.85
        C349.86,88.03,334.67,103.41,315.89,103.74z"
      />
      {/* L */}
      <path
        d="M403.08,102.73c-20.83,0-37.77-16.95-37.77-37.77V11.37C365.3,5.09,370.4,0,376.68,0h6.89v64.96
        c0,8.22,5.11,15.26,12.31,18.13c4.34,1.73,7.2,5.9,7.2,10.57V102.73z"
      />
      <path d="M391.71,44.44h-17.27V26.17h28.64v6.89C403.08,39.35,397.99,44.44,391.71,44.44z" />
      {/* R */}
      <path
        d="M436.06,102.74h-6.89c-6.28,0-11.37-5.09-11.37-11.37V65.35c0-22.63,18.41-41.03,41.03-41.03v8.85
        c0,4.84-3.08,9.11-7.63,10.74c-8.81,3.14-15.13,11.57-15.13,21.45V102.74z"
      />
      {/* A */}
      <path d="M544.21,102.73h-6.89c-6.28,0-11.37-5.09-11.37-11.37V64.03h18.27V102.73z" />
      <path
        d="M504.5,103.74c-21.9,0-39.71-17.81-39.71-39.71s17.81-39.71,39.71-39.71c21.9,0,39.71,17.81,39.71,39.71
        S526.4,103.74,504.5,103.74z M504.5,42.58c-11.83,0-21.45,9.62-21.45,21.45c0,11.83,9.62,21.45,21.45,21.45
        c11.82,0,21.45-9.62,21.45-21.45C525.94,52.2,516.32,42.58,504.5,42.58z"
      />
    </>
  );
}

export function WordmarkEnSVG({
  className,
  width = 150,
  height,
  "aria-label": ariaLabel,
}: SVGProps) {
  const computedHeight = height ?? Math.round((width * 103.74) / 544.21);
  if (ariaLabel) {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 544.21 103.74"
        width={width}
        height={computedHeight}
        className={className}
        aria-label={ariaLabel}
        role="img"
        fill="currentColor"
      >
        <WordmarkPaths />
      </svg>
    );
  }
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 544.21 103.74"
      width={width}
      height={computedHeight}
      className={className}
      aria-hidden="true"
      role="img"
      fill="currentColor"
    >
      <WordmarkPaths />
    </svg>
  );
}

// ─── Full Logo (logomark + wordmark, horizontal) ───────────────────────────────
// Composite of logomark + English wordmark side-by-side, matching Logo variant="en"

export interface LogoEnSVGProps extends SVGProps {
  /** Gap between logomark and wordmark (default 12px) */
  gap?: number;
}

export function LogoEnSVG({
  className,
  width = 160,
  gap = 12,
  "aria-label": ariaLabel,
}: LogoEnSVGProps) {
  const logomarkAspect = 535.71 / 500;
  const wordmarkAspect = 544.21 / 103.74;
  const h = Math.round(width / (logomarkAspect + gap / width + wordmarkAspect));
  const logomarkW = Math.round(h * logomarkAspect);
  const wordmarkW = Math.round(h * wordmarkAspect);
  const totalW = logomarkW + gap + wordmarkW;

  const children = (
    <>
      <g transform={`scale(${logomarkW / 535.71}, ${h / 500})`} fill="currentColor">
        <path d={LOGOMARK_PATH} />
      </g>
      <g
        transform={`translate(${logomarkW + gap}, 0) scale(${wordmarkW / 544.21}, ${h / 103.74})`}
        fill="currentColor"
      >
        <WordmarkPaths />
      </g>
    </>
  );

  if (ariaLabel) {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox={`0 0 ${totalW} ${h}`}
        width={totalW}
        height={h}
        className={className}
        aria-label={ariaLabel}
        role="img"
      >
        {children}
      </svg>
    );
  }
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${totalW} ${h}`}
      width={totalW}
      height={h}
      className={className}
      aria-hidden="true"
      role="img"
    >
      {children}
    </svg>
  );
}
