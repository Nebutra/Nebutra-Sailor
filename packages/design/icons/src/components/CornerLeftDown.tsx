import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const CornerLeftDown = forwardRef<SVGSVGElement, IconProps>(
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
        d="M13.25 2.75H14v-1.5H7A1.75 1.75 0 0 0 5.25 3v9.69l-1.97-1.97-.53-.53-1.06 1.06.53.53 3.25 3.25a.75.75 0 0 0 1.06 0l3.25-3.25.53-.53-1.06-1.06-.53.53-1.97 1.97V3A.25.25 0 0 1 7 2.75z"
        clipRule="evenodd"
      />
    </svg>
  ),
);
CornerLeftDown.displayName = "CornerLeftDown";

export { CornerLeftDown };
export default CornerLeftDown;
