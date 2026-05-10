import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const BellSmall = forwardRef<SVGSVGElement, IconProps>(
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
        d="M8 2.5a4 4 0 0 0-4 4v1.386a.73.73 0 0 1-.215.518l-.565.566-.22.22V11h10V9.19l-.22-.22-.565-.566A.73.73 0 0 1 12 7.886V6.5a4 4 0 0 0-4-4m-2.5 4a2.5 2.5 0 0 1 5 0v1.386c0 .592.235 1.16.654 1.579l.035.035H4.811l.035-.035c.419-.419.654-.987.654-1.58zm2.5 7a2.5 2.5 0 0 0 2.292-1.5H5.708A2.5 2.5 0 0 0 8 13.5"
        clipRule="evenodd"
      />
    </svg>
  ),
);
BellSmall.displayName = "BellSmall";

export { BellSmall };
export default BellSmall;
