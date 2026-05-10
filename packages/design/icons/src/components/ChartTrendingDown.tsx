import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const ChartTrendingDown = forwardRef<SVGSVGElement, IconProps>(
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
        d="M13.438 11.5h-3.364V13H15a1 1 0 0 0 1-1V7.075h-1.5v3.364L9.207 5.148a1 1 0 0 0-1.414 0L5.5 7.438 1.78 3.72l-.53-.53L.19 4.25l.53.53 4.073 4.074a1 1 0 0 0 1.414 0L8.5 6.562z"
        clipRule="evenodd"
      />
    </svg>
  ),
);
ChartTrendingDown.displayName = "ChartTrendingDown";

export { ChartTrendingDown };
export default ChartTrendingDown;
