import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const SkipForwardFill = forwardRef<SVGSVGElement, IconProps>(
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
        d="M11.669 8.21a.25.25 0 0 0 0-.42L1.384 1.244a.25.25 0 0 0-.384.21v13.09a.25.25 0 0 0 .384.21zM15 2v-.75h-1.5v13.5H15V2"
        clipRule="evenodd"
      />
    </svg>
  ),
);
SkipForwardFill.displayName = "SkipForwardFill";

export { SkipForwardFill };
export default SkipForwardFill;
