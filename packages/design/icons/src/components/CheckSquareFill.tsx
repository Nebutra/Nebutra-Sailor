import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const CheckSquareFill = forwardRef<SVGSVGElement, IconProps>(
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
        d="M15 16H1a1 1 0 0 1-1-1V1a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1m-3.22-9.72.53-.53-1.06-1.06-.53.53L6.5 9.44 5.28 8.22l-.53-.53-1.06 1.06.53.53 1.75 1.75a.75.75 0 0 0 1.06 0z"
        clipRule="evenodd"
      />
    </svg>
  ),
);
CheckSquareFill.displayName = "CheckSquareFill";

export { CheckSquareFill };
export default CheckSquareFill;
