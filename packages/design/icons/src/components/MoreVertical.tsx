import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const MoreVertical = forwardRef<SVGSVGElement, IconProps>(
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
        d="M8 4a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3m0 5.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3m-1.5 4a1.5 1.5 0 1 0 3 0 1.5 1.5 0 0 0-3 0"
        clipRule="evenodd"
      />
    </svg>
  ),
);
MoreVertical.displayName = "MoreVertical";

export { MoreVertical };
export default MoreVertical;
