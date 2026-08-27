import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const StarFill = forwardRef<SVGSVGElement, IconProps>(
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
        d="m8 .49 2.573 4.718 5.283.99-3.692 3.905.691 5.33L8 13.128l-4.855 2.305.691-5.33L.144 6.197l5.283-.989z"
      />
    </svg>
  ),
);
StarFill.displayName = "StarFill";

export { StarFill };
export default StarFill;
