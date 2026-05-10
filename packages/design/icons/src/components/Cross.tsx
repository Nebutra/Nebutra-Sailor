import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const Cross = forwardRef<SVGSVGElement, IconProps>(
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
        d="m12.47 13.53.53.53L14.06 13l-.53-.53L9.06 8l4.47-4.47.53-.53L13 1.94l-.53.53L8 6.94 3.53 2.47 3 1.94 1.94 3l.53.53L6.94 8l-4.47 4.47-.53.53L3 14.06l.53-.53L8 9.06z"
        clipRule="evenodd"
      />
    </svg>
  ),
);
Cross.displayName = "Cross";

export { Cross };
export default Cross;
