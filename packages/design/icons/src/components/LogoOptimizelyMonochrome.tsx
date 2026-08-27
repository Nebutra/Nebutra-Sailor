import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const LogoOptimizelyMonochrome = forwardRef<SVGSVGElement, IconProps>(
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
        d="M5.706 8.632v1.624c1.234 0 2.42-.477 3.295-1.323a4.46 4.46 0 0 0 1.371-3.198H8.7c0 .768-.32 1.507-.875 2.051a3.09 3.09 0 0 1-2.12.846"
      />
      <path
        fill="currentColor"
        d="M5.705 13.104a3 3 0 0 1-2.1-.846 2.87 2.87 0 0 1-.875-2.041c0-.768.311-1.498.875-2.042a3 3 0 0 1 2.1-.846V5.715A4.74 4.74 0 0 0 2.43 7.028a4.6 4.6 0 0 0-1.011 1.458 4.55 4.55 0 0 0-.36 1.721c0 .593.117 1.176.35 1.72.233.545.574 1.041 1.001 1.46.428.417.944.748 1.507.971.564.224 1.167.34 1.77.34h.01v-1.594zM5.706 13.104v1.614a4.73 4.73 0 0 0 3.276-1.312 4.43 4.43 0 0 0 1.361-3.18H8.681c0 .769-.312 1.498-.875 2.042a3.12 3.12 0 0 1-2.1.836M5.706 4.12v1.615a4.73 4.73 0 0 0 3.276-1.313 4.45 4.45 0 0 0 1.361-3.179H8.681c0 .768-.312 1.497-.875 2.042a3.07 3.07 0 0 1-2.1.836M10.362 4.12v1.615a4.73 4.73 0 0 0 3.277-1.313 4.45 4.45 0 0 0 1.36-3.179h-1.662c0 .768-.31 1.497-.875 2.042a3.06 3.06 0 0 1-2.1.836"
      />
    </svg>
  ),
);
LogoOptimizelyMonochrome.displayName = "LogoOptimizelyMonochrome";

export { LogoOptimizelyMonochrome };
export default LogoOptimizelyMonochrome;
