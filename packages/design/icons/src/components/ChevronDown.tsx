import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const ChevronDown = forwardRef<SVGSVGElement, IconProps>(
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
        d="m14.06 5.5-.53.53-4.823 4.824a1 1 0 0 1-1.414 0L2.47 6.03l-.53-.53L3 4.44l.53.53L8 9.44l4.47-4.47.53-.53z"
        clipRule="evenodd"
      />
    </svg>
  ),
);
ChevronDown.displayName = "ChevronDown";

export { ChevronDown };
export default ChevronDown;
