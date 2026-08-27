import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const ChartBarMiddle = forwardRef<SVGSVGElement, IconProps>(
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
        d="M8.75 1v14h-1.5V1zM3.5 9v6H2V9zM14 6.75V6h-1.5v9H14V6.75"
        clipRule="evenodd"
      />
    </svg>
  ),
);
ChartBarMiddle.displayName = "ChartBarMiddle";

export { ChartBarMiddle };
export default ChartBarMiddle;
