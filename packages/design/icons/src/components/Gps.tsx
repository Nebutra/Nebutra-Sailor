import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const Gps = forwardRef<SVGSVGElement, IconProps>(({ size = 16, width, height, ...props }, ref) => (
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
      strokeLinejoin="bevel"
      strokeWidth={1.5}
      d="m1 6 14-5-5 14-2.34-6.085a1 1 0 0 0-.575-.575z"
    />
  </svg>
));
Gps.displayName = "Gps";

export { Gps };
export default Gps;
