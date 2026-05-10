import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const ChevronCircleRightFill = forwardRef<SVGSVGElement, IconProps>(
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
        d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16M7.53 4.72 7 4.19 5.94 5.25l.53.53L8.69 8l-2.22 2.22-.53.53L7 11.81l.53-.53 2.574-2.573a1 1 0 0 0 0-1.414z"
        clipRule="evenodd"
      />
    </svg>
  ),
);
ChevronCircleRightFill.displayName = "ChevronCircleRightFill";

export { ChevronCircleRightFill };
export default ChevronCircleRightFill;
