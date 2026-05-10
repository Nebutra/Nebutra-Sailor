import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const ToggleOnAlt = forwardRef<SVGSVGElement, IconProps>(
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
        d="M6 3.5h4a4.5 4.5 0 1 1 0 9H6a4.5 4.5 0 1 1 0-9M0 8a6 6 0 0 1 6-6h4a6 6 0 0 1 0 12H6a6 6 0 0 1-6-6m10 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6"
        clipRule="evenodd"
      />
    </svg>
  ),
);
ToggleOnAlt.displayName = "ToggleOnAlt";

export { ToggleOnAlt };
export default ToggleOnAlt;
