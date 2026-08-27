import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const PlusSquareSmall = forwardRef<SVGSVGElement, IconProps>(
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
        d="M5 4.25h6a.75.75 0 0 1 .75.75v6a.75.75 0 0 1-.75.75H5a.75.75 0 0 1-.75-.75V5A.75.75 0 0 1 5 4.25M3 5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zm4.375 5.375v-1.75h-1.75v-1.25h1.75v-1.75h1.25v1.75h1.75v1.25h-1.75v1.75z"
        clipRule="evenodd"
      />
    </svg>
  ),
);
PlusSquareSmall.displayName = "PlusSquareSmall";

export { PlusSquareSmall };
export default PlusSquareSmall;
