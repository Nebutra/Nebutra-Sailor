import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const CornerUpRight = forwardRef<SVGSVGElement, IconProps>(
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
        d="m11.53 10.03-.53.53L9.94 9.5l.53-.53L12.44 7H2.75a.25.25 0 0 0-.25.25v7H1v-7c0-.966.784-1.75 1.75-1.75h9.69l-1.97-1.97L9.94 3 11 1.94l.53.53 3.25 3.25a.75.75 0 0 1 0 1.06z"
        clipRule="evenodd"
      />
    </svg>
  ),
);
CornerUpRight.displayName = "CornerUpRight";

export { CornerUpRight };
export default CornerUpRight;
