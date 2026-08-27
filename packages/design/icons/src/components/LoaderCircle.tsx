import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const LoaderCircle = forwardRef<SVGSVGElement, IconProps>(
  ({ size = 16, width, height, ...props }, ref) => (
    <svg
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
      width={width ?? size}
      height={height ?? size}
      fill="none"
      strokeLinejoin="round"
      viewBox="0 0 16 16"
      ref={ref}
      {...props}
    >
      <g stroke="currentColor" strokeWidth={1.5} clipPath="url(#clip0_2393_1490)">
        <path d="M8 0v4" />
        <path d="M8 16v-4" opacity={0.5} />
        <path d="m3.298 1.528 2.35 3.236" opacity={0.9} />
        <path d="m12.702 1.528-2.35 3.236" opacity={0.1} />
        <path d="m12.702 14.472-2.35-3.236" opacity={0.4} />
        <path d="m3.298 14.472 2.35-3.236" opacity={0.6} />
        <path d="m15.609 5.528-3.805 1.236" opacity={0.2} />
        <path d="m.392 10.472 3.804-1.236" opacity={0.7} />
        <path d="m15.609 10.472-3.805-1.236" opacity={0.3} />
        <path d="m.392 5.528 3.804 1.236" opacity={0.8} />
      </g>
      <defs>
        <clipPath id="clip0_2393_1490">
          <path fill="#fff" d="M0 0h16v16H0z" />
        </clipPath>
      </defs>
    </svg>
  ),
);
LoaderCircle.displayName = "LoaderCircle";

export { LoaderCircle };
export default LoaderCircle;
