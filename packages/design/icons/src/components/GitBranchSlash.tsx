import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const GitBranchSlash = forwardRef<SVGSVGElement, IconProps>(
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
        d="M13.588 14.627a.75.75 0 0 0 .942-1.157l-3.256-3.257a6.75 6.75 0 0 0 1.413-3.292 3.001 3.001 0 1 0-1.512-.036 5.25 5.25 0 0 1-.97 2.259L4.75 3.689V1h-1.5v1.19L1.53.47a.75.75 0 0 0-1.156.943zM3.25 6.41v2.685a3.001 3.001 0 1 0 3.67 3.592 6.8 6.8 0 0 0 2.004-.603l-1.145-1.145q-.436.158-.894.236a3 3 0 0 0-2.135-2.08V7.91zM13.5 4a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0M4 13.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3"
        clipRule="evenodd"
      />
    </svg>
  ),
);
GitBranchSlash.displayName = "GitBranchSlash";

export { GitBranchSlash };
export default GitBranchSlash;
