import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const Terminal = forwardRef<SVGSVGElement, IconProps>(
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
        d="m1.53 12.78-.53.53-1.06-1.06.53-.53L4.19 8 .47 4.28l-.53-.53L1 2.69l.53.53 4.074 4.073a1 1 0 0 1 0 1.414zm7.22-.28H8V14h8v-1.5H8.75"
        clipRule="evenodd"
      />
    </svg>
  ),
);
Terminal.displayName = "Terminal";

export { Terminal };
export default Terminal;
