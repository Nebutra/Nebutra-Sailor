import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const Robot = forwardRef<SVGSVGElement, IconProps>(
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
        d="M8.75 2.8a1.5 1.5 0 1 0-1.5 0V5H7a6 6 0 0 0-5.917 5H0v3h1v3h14v-3h1v-3h-1.083A6 6 0 0 0 9 5h-.25zM7 6.5A4.5 4.5 0 0 0 2.5 11v3.5h11V11A4.5 4.5 0 0 0 9 6.5zm.25 4.75a1.75 1.75 0 1 1-3.5 0 1.75 1.75 0 0 1 3.5 0M10.5 13a1.75 1.75 0 1 0 0-3.5 1.75 1.75 0 0 0 0 3.5"
        clipRule="evenodd"
      />
    </svg>
  ),
);
Robot.displayName = "Robot";

export { Robot };
export default Robot;
