import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const ArrowDownLeft = forwardRef<SVGSVGElement, IconProps>(
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
        d="M4.56 12.5H11V14H3a1 1 0 0 1-1-1V5h1.5v6.438l9.219-9.218.53-.53 1.06 1.06-.53.53z"
        clipRule="evenodd"
      />
    </svg>
  ),
);
ArrowDownLeft.displayName = "ArrowDownLeft";

export { ArrowDownLeft };
export default ArrowDownLeft;
