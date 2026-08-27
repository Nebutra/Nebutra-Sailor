import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const AlignmentCenter = forwardRef<SVGSVGElement, IconProps>(
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
        d="M1.75 2H1v1.5h14V2H1.75M3.5 7.25h9v1.5h-9zm-1 5.25h11V14h-11z"
        clipRule="evenodd"
      />
    </svg>
  ),
);
AlignmentCenter.displayName = "AlignmentCenter";

export { AlignmentCenter };
export default AlignmentCenter;
