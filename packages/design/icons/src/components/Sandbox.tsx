import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const Sandbox = forwardRef<SVGSVGElement, IconProps>(
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
        d="M14.5 2.25a.75.75 0 0 0-.75-.75H10.5V0h3.25A2.25 2.25 0 0 1 16 2.25V5.5h-1.5zM0 2.25A2.25 2.25 0 0 1 2.25 0H5.5v1.5H2.25a.75.75 0 0 0-.75.75V5.5H0zm2.94 8L5.19 8 2.94 5.75 4 4.69l2.604 2.603a1 1 0 0 1 0 1.414L4 11.31zm4.932-.623H12.5v1.5H7.872zM10.5 14.5h3.25a.75.75 0 0 0 .75-.75V10.5H16v3.25A2.25 2.25 0 0 1 13.75 16H10.5zM2.25 16A2.25 2.25 0 0 1 0 13.75V10.5h1.5v3.25c0 .414.336.75.75.75H5.5V16z"
      />
    </svg>
  ),
);
Sandbox.displayName = "Sandbox";

export { Sandbox };
export default Sandbox;
