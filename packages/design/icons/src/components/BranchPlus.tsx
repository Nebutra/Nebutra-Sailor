import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const BranchPlus = forwardRef<SVGSVGElement, IconProps>(
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
        d="M10 0a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h.854a5.25 5.25 0 0 1-3.969 3.175 3 3 0 0 0-2.135-2.08V1h-1.5v8.095a3.001 3.001 0 1 0 3.671 3.592A6.75 6.75 0 0 0 12.447 8H14a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2zm.25 3.375h-.625v1.25h1.75v1.75h1.25v-1.75h1.75v-1.25h-1.75v-1.75h-1.25v1.75zM5.5 12a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0"
        clipRule="evenodd"
      />
    </svg>
  ),
);
BranchPlus.displayName = "BranchPlus";

export { BranchPlus };
export default BranchPlus;
