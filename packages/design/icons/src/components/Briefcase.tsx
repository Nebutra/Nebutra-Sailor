import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const Briefcase = forwardRef<SVGSVGElement, IconProps>(
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
        d="M6 2.5h4a.5.5 0 0 1 .5.5v1h-5V3a.5.5 0 0 1 .5-.5M4 4V3a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v1h4v9.5a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 0 13.5V4h4m8 1.5H1.5v3.75h5.75V8.5h1.5v.75h5.75V5.5zm-3.25 5.25h5.75v2.75a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1v-2.75h5.75v.75h1.5z"
        clipRule="evenodd"
      />
    </svg>
  ),
);
Briefcase.displayName = "Briefcase";

export { Briefcase };
export default Briefcase;
