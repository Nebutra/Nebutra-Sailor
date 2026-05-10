import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const MagnifyingGlassSmall = forwardRef<SVGSVGElement, IconProps>(
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
        d="M3.5 7a3.5 3.5 0 1 1 6.13 2.309l-.321.322A3.5 3.5 0 0 1 3.5 7m6.465 4.026a5 5 0 1 1 1.06-1.06l3.005 3.004.53.53-1.06 1.06-.53-.53z"
        clipRule="evenodd"
      />
    </svg>
  ),
);
MagnifyingGlassSmall.displayName = "MagnifyingGlassSmall";

export { MagnifyingGlassSmall };
export default MagnifyingGlassSmall;
