import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const ArrowUpLeft = forwardRef<SVGSVGElement, IconProps>(
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
        d="M2 10.25V11h1.5V4.56l9.22 9.22.53.53 1.06-1.06-.53-.53L4.56 3.5H11V2H3a1 1 0 0 0-1 1z"
        clipRule="evenodd"
      />
    </svg>
  ),
);
ArrowUpLeft.displayName = "ArrowUpLeft";

export { ArrowUpLeft };
export default ArrowUpLeft;
