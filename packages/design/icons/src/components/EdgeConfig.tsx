import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const EdgeConfig = forwardRef<SVGSVGElement, IconProps>(
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
      <svg
        aria-hidden="true"
        xmlns="http://www.w3.org/2000/svg"
        width={width ?? size}
        height={height ?? size}
        viewBox="0 0 16 16"
        ref={ref}
        {...props}
      >
        <g clipPath="url(#clip0_3394_1494)">
          <circle cx={8} cy={6} r={1.25} fill="currentColor" />
          <path
            stroke="currentColor"
            strokeLinecap="square"
            strokeWidth={1.5}
            d="M8 10.5v2.349c0 .587-.174 1.162-.5 1.651m-4 0a1.75 1.75 0 0 1-1.75-1.75V9.955C1.75 8.878 1 8.25 0 8.25c1 0 1.75-.628 1.75-1.706V3.75C1.75 2.784 2.534 2 3.5 2m9 0c.966 0 1.75.784 1.75 1.75v2.794c0 1.078.75 1.706 1.75 1.706-1 0-1.75.628-1.75 1.706v2.794a1.75 1.75 0 0 1-1.75 1.75"
          />
        </g>
        <defs>
          <clipPath id="clip0_3394_1494">
            <path fill="currentColor" d="M0 0h16v16H0z" />
          </clipPath>
        </defs>
      </svg>
    </svg>
  ),
);
EdgeConfig.displayName = "EdgeConfig";

export { EdgeConfig };
export default EdgeConfig;
