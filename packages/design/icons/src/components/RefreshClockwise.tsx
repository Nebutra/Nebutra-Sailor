import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const RefreshClockwise = forwardRef<SVGSVGElement, IconProps>(
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
        d="M8 1.25a7 7 0 0 0-6.16 3.672l-.357.66 1.32.713.357-.66a5.503 5.503 0 0 1 10.112 1.039h-2.198v1.5h4.175a.75.75 0 0 0 .75-.75V3.25h-1.5v2.395A7 7 0 0 0 8 1.25m-6.499 9.606v2.394h-1.5V9.075a.75.75 0 0 1 .75-.75h4.175v1.5H2.729a5.503 5.503 0 0 0 10.098 1.065l.36-.658 1.316.72-.361.659a7.002 7.002 0 0 1-12.64-.755"
        clipRule="evenodd"
      />
    </svg>
  ),
);
RefreshClockwise.displayName = "RefreshClockwise";

export { RefreshClockwise };
export default RefreshClockwise;
