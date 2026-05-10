import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const Workflow = forwardRef<SVGSVGElement, IconProps>(
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
        d="m5.75 7 .67.336-1.567 3.136c.535.299.897.871.897 1.528v2A1.75 1.75 0 0 1 4 15.75H2A1.75 1.75 0 0 1 .25 14v-2c0-.966.784-1.75 1.75-1.75h1.287L5.08 6.665zM14 10.25c.966 0 1.75.784 1.75 1.75v2A1.75 1.75 0 0 1 14 15.75h-2c-.882 0-1.61-.652-1.73-1.5H7v-1.5h3.25V12c0-.966.784-1.75 1.75-1.75zm-12 1.5a.25.25 0 0 0-.25.25v2c0 .138.112.25.25.25h2a.25.25 0 0 0 .25-.25v-2a.25.25 0 0 0-.25-.25zm10 0a.25.25 0 0 0-.25.25v2c0 .138.112.25.25.25h2a.25.25 0 0 0 .25-.25v-2a.25.25 0 0 0-.25-.25zM9 .25c.966 0 1.75.784 1.75 1.75v2c0 .446-.17.852-.444 1.161l1.898 3.48-1.316.72L8.919 5.75H7A1.75 1.75 0 0 1 5.25 4V2c0-.966.784-1.75 1.75-1.75zm-2 1.5a.25.25 0 0 0-.25.25v2c0 .138.112.25.25.25h2A.25.25 0 0 0 9.25 4V2A.25.25 0 0 0 9 1.75z"
      />
    </svg>
  ),
);
Workflow.displayName = "Workflow";

export { Workflow };
export default Workflow;
