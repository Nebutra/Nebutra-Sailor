import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const Fulcrum = forwardRef<SVGSVGElement, IconProps>(
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
        d="m15.206 1.721.721-.206-.412-1.442-.721.206-14 4-.721.206.412 1.442.721-.206zM7.111 5.397 8 4l.889 1.397 5.157 8.103L15 15H1l.955-1.5zM3.733 13.5 8 6.794l4.268 6.706z"
        clipRule="evenodd"
      />
    </svg>
  ),
);
Fulcrum.displayName = "Fulcrum";

export { Fulcrum };
export default Fulcrum;
