import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const Filter = forwardRef<SVGSVGElement, IconProps>(
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
        d="M1 0h14v3.31l-.22.22-4.28 4.28V16H8.782l-.185-.117-2.75-1.75-.347-.221V7.81L1.22 3.53 1 3.31V0m1.5 1.5v1.19l4.28 4.28.22.22v5.898l2 1.273V7.19l.22-.22 4.28-4.28V1.5z"
        clipRule="evenodd"
      />
    </svg>
  ),
);
Filter.displayName = "Filter";

export { Filter };
export default Filter;
