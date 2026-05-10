import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const RefreshCounterClockwise = forwardRef<SVGSVGElement, IconProps>(
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
        d="M2.729 6.425a5.503 5.503 0 0 1 10.112-1.04l.357.66 1.319-.714-.357-.66a7.002 7.002 0 0 0-12.658.723V3h-1.5v4.175c0 .414.335.75.75.75h4.174v-1.5H2.729m10.542 3.15h-2.197v-1.5h4.175a.75.75 0 0 1 .75.75V13h-1.5v-2.395a7.002 7.002 0 0 1-12.64.755l-.361-.657 1.315-.721.36.658a5.503 5.503 0 0 0 10.098-1.064"
        clipRule="evenodd"
      />
    </svg>
  ),
);
RefreshCounterClockwise.displayName = "RefreshCounterClockwise";

export { RefreshCounterClockwise };
export default RefreshCounterClockwise;
