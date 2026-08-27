import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const ShieldCheckFill = forwardRef<SVGSVGElement, IconProps>(
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
        d="M6.75 0c0 .467.145.797.372 1.062.242.281.608.522 1.092.735.482.212 1.033.374 1.608.528.553.148 1.162.295 1.665.463L12 2.96v6.568a5.25 5.25 0 0 1-2.813 4.65l-2.84 1.487-.347.183-.348-.183-2.839-1.486A5.25 5.25 0 0 1 0 9.528V2.958l.513-.17c.503-.169 1.112-.316 1.665-.464.575-.154 1.126-.316 1.608-.528.484-.213.85-.454 1.092-.735C5.105.797 5.25.467 5.25 0zM5 8.94l-1-1L2.94 9l1.53 1.53a.75.75 0 0 0 1.06 0L9.06 7 8 5.94z"
      />
    </svg>
  ),
);
ShieldCheckFill.displayName = "ShieldCheckFill";

export { ShieldCheckFill };
export default ShieldCheckFill;
