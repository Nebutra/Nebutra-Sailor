import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const ChartActivity = forwardRef<SVGSVGElement, IconProps>(
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
        d="m5.513 3.624-1.75 4.723A1 1 0 0 1 2.827 9H0V7.5h2.478l2.089-5.64c.32-.864 1.54-.872 1.87-.011l4.077 10.597L12.24 8.13a1 1 0 0 1 .928-.629H16V9h-2.492l-2.075 5.187c-.338.844-1.535.836-1.862-.013z"
        clipRule="evenodd"
      />
    </svg>
  ),
);
ChartActivity.displayName = "ChartActivity";

export { ChartActivity };
export default ChartActivity;
