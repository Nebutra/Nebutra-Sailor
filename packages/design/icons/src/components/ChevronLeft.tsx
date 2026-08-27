import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const ChevronLeft = forwardRef<SVGSVGElement, IconProps>(
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
        d="m10.5 14.06-.53-.53-4.824-4.823a1 1 0 0 1 0-1.414L9.97 2.47l.53-.53L11.56 3l-.53.53L6.56 8l4.47 4.47.53.53z"
        clipRule="evenodd"
      />
    </svg>
  ),
);
ChevronLeft.displayName = "ChevronLeft";

export { ChevronLeft };
export default ChevronLeft;
