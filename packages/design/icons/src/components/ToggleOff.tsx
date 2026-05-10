import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const ToggleOff = forwardRef<SVGSVGElement, IconProps>(
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
        d="M8.57 4.5H11a3.5 3.5 0 1 1 0 7H8.57A4.98 4.98 0 0 0 10 8a4.98 4.98 0 0 0-1.43-3.5M5 4.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7M0 8a5 5 0 0 1 5-5h6a5 5 0 0 1 0 10H5a5 5 0 0 1-5-5"
        clipRule="evenodd"
      />
    </svg>
  ),
);
ToggleOff.displayName = "ToggleOff";

export { ToggleOff };
export default ToggleOff;
