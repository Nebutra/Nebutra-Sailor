import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const ChartBarRandom = forwardRef<SVGSVGElement, IconProps>(
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
        d="M14 1v14h-1.5V1zM8.75 6v9h-1.5V6zM3.5 4.75V4H2v11h1.5V4.75"
        clipRule="evenodd"
      />
    </svg>
  ),
);
ChartBarRandom.displayName = "ChartBarRandom";

export { ChartBarRandom };
export default ChartBarRandom;
