import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const Speaker = forwardRef<SVGSVGElement, IconProps>(
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
        d="m6 10.5.67.158 5.83 2.915V2.427L6.67 5.342 6 5.5H3.5v5zM12.5.75 6 4H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h3l6.5 3.25L14 16V0z"
        clipRule="evenodd"
      />
    </svg>
  ),
);
Speaker.displayName = "Speaker";

export { Speaker };
export default Speaker;
