import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const GitCommit = forwardRef<SVGSVGElement, IconProps>(
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
        d="M8 10.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5M8 12c1.953 0 3.579-1.4 3.93-3.25H16v-1.5h-4.07a4.001 4.001 0 0 0-7.86 0H0v1.5h4.07A4 4 0 0 0 8 12"
        clipRule="evenodd"
      />
    </svg>
  ),
);
GitCommit.displayName = "GitCommit";

export { GitCommit };
export default GitCommit;
