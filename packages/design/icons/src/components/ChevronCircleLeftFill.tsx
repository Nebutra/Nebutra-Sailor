import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const ChevronCircleLeftFill = forwardRef<SVGSVGElement, IconProps>(
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
        d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16m.47-4.72.53.53 1.06-1.06-.53-.53L7.31 8l2.22-2.22.53-.53L9 4.19l-.53.53-2.574 2.573a1 1 0 0 0 0 1.414z"
        clipRule="evenodd"
      />
    </svg>
  ),
);
ChevronCircleLeftFill.displayName = "ChevronCircleLeftFill";

export { ChevronCircleLeftFill };
export default ChevronCircleLeftFill;
