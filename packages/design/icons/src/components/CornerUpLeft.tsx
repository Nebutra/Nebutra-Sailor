import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const CornerUpLeft = forwardRef<SVGSVGElement, IconProps>(
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
        d="m4.47 10.03.53.53L6.06 9.5l-.53-.53L3.56 7h9.69a.25.25 0 0 1 .25.25v7H15v-7a1.75 1.75 0 0 0-1.75-1.75H3.56l1.97-1.97.53-.53L5 1.94l-.53.53-3.25 3.25a.75.75 0 0 0 0 1.06z"
        clipRule="evenodd"
      />
    </svg>
  ),
);
CornerUpLeft.displayName = "CornerUpLeft";

export { CornerUpLeft };
export default CornerUpLeft;
