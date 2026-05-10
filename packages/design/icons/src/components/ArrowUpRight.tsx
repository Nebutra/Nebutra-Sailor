import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const ArrowUpRight = forwardRef<SVGSVGElement, IconProps>(
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
        d="M5.75 2H5v1.5h6.44l-9.22 9.22-.53.53 1.06 1.06.53-.53L12.5 4.562V11h1.5V3a1 1 0 0 0-1-1z"
        clipRule="evenodd"
      />
    </svg>
  ),
);
ArrowUpRight.displayName = "ArrowUpRight";

export { ArrowUpRight };
export default ArrowUpRight;
