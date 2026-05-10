import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const LayoutDashed = forwardRef<SVGSVGElement, IconProps>(
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
        d="M14.5 2.5h-13V5H3v1H1.5v6.5a1 1 0 0 0 1 1H5v-1h1v1h7.5a1 1 0 0 0 1-1V6H14V5h.5zM1.5 1H0v11.5A2.5 2.5 0 0 0 2.5 15h11a2.5 2.5 0 0 0 2.5-2.5V1H1.5M5 9V7.5h1V9zm0 2.5V10h1v1.5zM6.5 5v1H8V5zM4 5v1h1.5V5zm5 0v1h1.5V5zm2.5 0v1H13V5z"
        clipRule="evenodd"
      />
    </svg>
  ),
);
LayoutDashed.displayName = "LayoutDashed";

export { LayoutDashed };
export default LayoutDashed;
