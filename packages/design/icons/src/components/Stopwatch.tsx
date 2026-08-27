import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const Stopwatch = forwardRef<SVGSVGElement, IconProps>(
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
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M7.25 1.25v.79a6.97 6.97 0 0 0-3.641 1.508L3.03 2.97l-.53-.53L1.44 3.5l.53.53.578.579a7 7 0 1 0 10.904 0l.578-.579.53-.53-1.06-1.06-.53.53-.579.578A6.97 6.97 0 0 0 8.75 2.04v-.79H10v-1.5H6v1.5h1.25M2.5 9a5.5 5.5 0 1 1 11 0 5.5 5.5 0 0 1-11 0m6.25-2.25V6h-1.5v3.75h1.5v-3"
        clipRule="evenodd"
      />
    </svg>
  ),
);
Stopwatch.displayName = "Stopwatch";

export { Stopwatch };
export default Stopwatch;
