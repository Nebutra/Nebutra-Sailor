import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const Spiral = forwardRef<SVGSVGElement, IconProps>(
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
        fill="transparent"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth={1.5}
        d="M12.742 5.776q.008-.136.008-.276a4.75 4.75 0 1 0-2.629 4.251"
      />
      <path
        fill="transparent"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth={1.5}
        d="M3.262 6.31A4.75 4.75 0 1 0 8 6.46"
      />
      <path
        fill="transparent"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth={1.5}
        d="M5.855 9.5a4.752 4.752 0 0 1 9.395 1A4.75 4.75 0 0 1 8 14.54"
      />
    </svg>
  ),
);
Spiral.displayName = "Spiral";

export { Spiral };
export default Spiral;
