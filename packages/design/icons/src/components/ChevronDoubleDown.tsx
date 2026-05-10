import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const ChevronDoubleDown = forwardRef<SVGSVGElement, IconProps>(
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
        d="M4.53 2.97 4 2.44 2.94 3.5l.53.53 3.823 3.824a1 1 0 0 0 1.414 0L12.53 4.03l.53-.53L12 2.44l-.53.53L8 6.44zm0 5L4 7.44 2.94 8.5l.53.53 3.823 3.824a1 1 0 0 0 1.414 0L12.53 9.03l.53-.53L12 7.44l-.53.53L8 11.44z"
        clipRule="evenodd"
      />
    </svg>
  ),
);
ChevronDoubleDown.displayName = "ChevronDoubleDown";

export { ChevronDoubleDown };
export default ChevronDoubleDown;
