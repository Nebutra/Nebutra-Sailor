import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const DataPointMedium = forwardRef<SVGSVGElement, IconProps>(
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
        d="M11.25 9.75a1.75 1.75 0 1 0 0-3.5 1.75 1.75 0 0 0 0 3.5m-4.5 2.75a1.75 1.75 0 1 0 0-3.5 1.75 1.75 0 0 0 0 3.5"
        clipRule="evenodd"
      />
      <circle cx={6.75} cy={5.25} r={1.75} fill="currentColor" opacity={0.25} />
    </svg>
  ),
);
DataPointMedium.displayName = "DataPointMedium";

export { DataPointMedium };
export default DataPointMedium;
