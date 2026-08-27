import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const ArrowUpDiagonalScale = forwardRef<SVGSVGElement, IconProps>(
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
        d="M9.75 1H9v1.5h3.439l-2.97 2.97-.53.53 1.06 1.06.53-.53 2.97-2.968V7h1.5V2a1 1 0 0 0-1-1zM2.501 12.438V9h-1.5v5a1 1 0 0 0 1 1H7v-1.5H3.56l2.97-2.97.53-.53-1.06-1.06-.53.53z"
        clipRule="evenodd"
      />
    </svg>
  ),
);
ArrowUpDiagonalScale.displayName = "ArrowUpDiagonalScale";

export { ArrowUpDiagonalScale };
export default ArrowUpDiagonalScale;
