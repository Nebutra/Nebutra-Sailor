import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const CanaryBird = forwardRef<SVGSVGElement, IconProps>(
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
        d="m7.5 6.592-.44.44-2.752 2.752C5.105 10.798 6.436 11.5 8 11.5c2.61 0 4.5-1.911 4.5-4V4.982A2.5 2.5 0 0 0 7.5 5v1.592M13.874 4A4.002 4.002 0 0 0 6 5v.969l-5.94 5.94 1.06 1.06 2.12-2.12C4.338 12.157 6.062 13 8 13v2h1.5v-2.173c2.588-.61 4.5-2.764 4.5-5.327V7l2-3zM10 6a1 1 0 1 0 0-2 1 1 0 0 0 0 2"
        clipRule="evenodd"
      />
    </svg>
  ),
);
CanaryBird.displayName = "CanaryBird";

export { CanaryBird };
export default CanaryBird;
