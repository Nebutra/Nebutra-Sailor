import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const GitBranch = forwardRef<SVGSVGElement, IconProps>(
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
        d="M4.75 1.75V1h-1.5v8.095a3.001 3.001 0 1 0 3.671 3.592 6.75 6.75 0 0 0 5.766-5.766 3.001 3.001 0 1 0-1.512-.036 5.25 5.25 0 0 1-4.29 4.29 3 3 0 0 0-2.135-2.08zM13.5 4a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0M4 13.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3"
        clipRule="evenodd"
      />
    </svg>
  ),
);
GitBranch.displayName = "GitBranch";

export { GitBranch };
export default GitBranch;
