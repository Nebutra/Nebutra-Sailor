import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const ClockRewind = forwardRef<SVGSVGElement, IconProps>(
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
        d="M7.965 2.5c3.06 0 5.535 2.466 5.535 5.5s-2.474 5.5-5.535 5.5a5.54 5.54 0 0 1-4.483-2.273l-.443-.605-1.211.885.442.605A7.04 7.04 0 0 0 7.965 15C11.846 15 15 11.87 15 8s-3.154-7-7.035-7A7.04 7.04 0 0 0 1.5 5.233V3H0v4.25c0 .414.336.75.75.75H4.5V6.5H2.637a5.53 5.53 0 0 1 5.328-4m.785 2.75V4.5h-1.5v3.366a1 1 0 0 0 .445.832l1.389.926.624.416.832-1.248-.624-.416-1.166-.777z"
        clipRule="evenodd"
      />
    </svg>
  ),
);
ClockRewind.displayName = "ClockRewind";

export { ClockRewind };
export default ClockRewind;
