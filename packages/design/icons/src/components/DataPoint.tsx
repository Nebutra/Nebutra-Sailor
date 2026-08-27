import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const DataPoint = forwardRef<SVGSVGElement, IconProps>(
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
        d="M7.5 5.25a1.75 1.75 0 1 1-3.5 0 1.75 1.75 0 0 1 3.5 0m0 5.5a1.75 1.75 0 1 1-3.5 0 1.75 1.75 0 0 1 3.5 0m2.75-1a1.75 1.75 0 1 0 0-3.5 1.75 1.75 0 0 0 0 3.5"
        clipRule="evenodd"
      />
    </svg>
  ),
);
DataPoint.displayName = "DataPoint";

export { DataPoint };
export default DataPoint;
