import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const ChevronCircleRight = forwardRef<SVGSVGElement, IconProps>(
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
        d="M8 14.5a6.5 6.5 0 1 1 0-13 6.5 6.5 0 0 1 0 13M0 8a8 8 0 1 0 16 0A8 8 0 0 0 0 8m7.53 3.28 2.58-2.58a.99.99 0 0 0 0-1.4L7.53 4.72 7 4.19 5.94 5.25l.53.53L8.69 8l-2.22 2.22-.53.53L7 11.81z"
        clipRule="evenodd"
      />
    </svg>
  ),
);
ChevronCircleRight.displayName = "ChevronCircleRight";

export { ChevronCircleRight };
export default ChevronCircleRight;
