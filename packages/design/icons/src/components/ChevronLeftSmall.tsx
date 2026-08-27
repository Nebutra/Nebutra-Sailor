import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const ChevronLeftSmall = forwardRef<SVGSVGElement, IconProps>(
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
        d="m9.25 12.06-.53-.53-2.824-2.823a1 1 0 0 1 0-1.414L8.72 4.47l.53-.53L10.31 5l-.53.53L7.31 8l2.47 2.47.53.53z"
        clipRule="evenodd"
      />
    </svg>
  ),
);
ChevronLeftSmall.displayName = "ChevronLeftSmall";

export { ChevronLeftSmall };
export default ChevronLeftSmall;
