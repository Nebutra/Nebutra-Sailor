/** The few interface icons the docs shell draws (16px grid, 1.5 stroke, currentColor). */
import type { SVGProps } from "react";

const base = {
  width: 16,
  height: 16,
  viewBox: "0 0 16 16",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
  focusable: false,
} as const;

export const SunIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}>
    <circle cx="8" cy="8" r="3" />
    <path d="M8 1.5v1.25M8 13.25v1.25M1.5 8h1.25M13.25 8h1.25M3.4 3.4l.9.9M11.7 11.7l.9.9M3.4 12.6l.9-.9M11.7 4.3l.9-.9" />
  </svg>
);
export const MoonIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}>
    <path d="M13.5 9.6A5.75 5.75 0 0 1 6.4 2.5a5.75 5.75 0 1 0 7.1 7.1Z" />
  </svg>
);
export const SystemIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}>
    <rect x="1.75" y="2.75" width="12.5" height="8.5" rx="1.5" />
    <path d="M5.5 13.75h5M8 11.25v2.5" />
  </svg>
);
export const StarIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} strokeWidth={1.25} {...p}>
    <path d="m8 1.9 1.8 3.7 4 .6-2.9 2.8.7 4L8 11.1 4.4 13l.7-4-2.9-2.8 4-.6Z" />
  </svg>
);
export const ArrowIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}>
    <path d="M3.5 8h9M8.75 4.25 12.5 8l-3.75 3.75" />
  </svg>
);
export const ExternalIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}>
    <path d="M6.5 3.25H3.75a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V9.5M9.5 2.75h3.75V6.5M13 3 7.5 8.5" />
  </svg>
);
export const GlobeIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}>
    <circle cx="8" cy="8" r="6.25" />
    <path d="M1.75 8h12.5M8 1.75c1.7 1.7 2.5 3.8 2.5 6.25S9.7 12.55 8 14.25C6.3 12.55 5.5 10.45 5.5 8S6.3 3.45 8 1.75Z" />
  </svg>
);
export const MarkdownIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}>
    <rect x="1.75" y="3.25" width="12.5" height="9.5" rx="1.5" />
    <path d="M4.25 10.25v-4.5l1.75 2 1.75-2v4.5M10.75 5.75v4.5M9.25 8.75l1.5 1.5 1.5-1.5" />
  </svg>
);
