import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const SortDescending = forwardRef<SVGSVGElement, IconProps>(
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
        d="M1.75 12H1v-1.5h5V12H1.75m0-4.25H1v-1.5h4v1.5H1.75m0-4.25H1V2h7v1.5H1.75m10.78 11.28a.75.75 0 0 1-1.06 0l-2.25-2.25-.53-.53 1.06-1.06.53.53.97.97V2h1.5v10.44l.97-.97.53-.53L15.31 12l-.53.53z"
        clipRule="evenodd"
      />
    </svg>
  ),
);
SortDescending.displayName = "SortDescending";

export { SortDescending };
export default SortDescending;
