import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const ToggleOn = forwardRef<SVGSVGElement, IconProps>(
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
        d="M7.43 11.5A4.98 4.98 0 0 1 6 8c0-1.363.545-2.598 1.43-3.5H5a3.5 3.5 0 1 0 0 7zM0 8a5 5 0 0 1 5-5h6a5 5 0 0 1 0 10H5a5 5 0 0 1-5-5"
        clipRule="evenodd"
      />
    </svg>
  ),
);
ToggleOn.displayName = "ToggleOn";

export { ToggleOn };
export default ToggleOn;
