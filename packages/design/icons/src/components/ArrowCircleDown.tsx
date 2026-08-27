import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const ArrowCircleDown = forwardRef<SVGSVGElement, IconProps>(
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
        d="M8.75 5.25V4.5h-1.5v4.94L5.78 7.97l-.53-.53L4.19 8.5l.53.53 2.75 2.75a.75.75 0 0 0 1.06 0l2.75-2.75.53-.53-1.06-1.06-.53.53-1.47 1.47zM1.5 8a6.5 6.5 0 1 1 13 0 6.5 6.5 0 0 1-13 0M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0"
        clipRule="evenodd"
      />
    </svg>
  ),
);
ArrowCircleDown.displayName = "ArrowCircleDown";

export { ArrowCircleDown };
export default ArrowCircleDown;
