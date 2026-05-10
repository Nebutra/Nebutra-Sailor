import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const ChevronCircleDownFill = forwardRef<SVGSVGElement, IconProps>(
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
        d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16m3.28-8.47.53-.53-1.06-1.06-.53.53L8 8.69 5.78 6.47l-.53-.53L4.19 7l.53.53 2.573 2.574a1 1 0 0 0 1.414 0z"
        clipRule="evenodd"
      />
    </svg>
  ),
);
ChevronCircleDownFill.displayName = "ChevronCircleDownFill";

export { ChevronCircleDownFill };
export default ChevronCircleDownFill;
