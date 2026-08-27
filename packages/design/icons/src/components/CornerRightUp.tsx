import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const CornerRightUp = forwardRef<SVGSVGElement, IconProps>(
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
        d="m6.22 4.72-.53.53 1.06 1.06.53-.53 1.97-1.97v9.69a.25.25 0 0 1-.25.25H2v1.5h7a1.75 1.75 0 0 0 1.75-1.75V3.81l1.97 1.97.53.53 1.06-1.06-.53-.53-3.25-3.25a.75.75 0 0 0-1.06 0z"
        clipRule="evenodd"
      />
    </svg>
  ),
);
CornerRightUp.displayName = "CornerRightUp";

export { CornerRightUp };
export default CornerRightUp;
