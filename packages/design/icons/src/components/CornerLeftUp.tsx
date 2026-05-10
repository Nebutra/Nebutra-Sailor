import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const CornerLeftUp = forwardRef<SVGSVGElement, IconProps>(
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
        d="m9.78 4.72.53.53-1.06 1.06-.53-.53-1.97-1.97v9.69c0 .138.112.25.25.25h7v1.5H7a1.75 1.75 0 0 1-1.75-1.75V3.81L3.28 5.78l-.53.53-1.06-1.06.53-.53 3.25-3.25a.75.75 0 0 1 1.06 0z"
        clipRule="evenodd"
      />
    </svg>
  ),
);
CornerLeftUp.displayName = "CornerLeftUp";

export { CornerLeftUp };
export default CornerLeftUp;
