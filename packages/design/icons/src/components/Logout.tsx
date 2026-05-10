import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const Logout = forwardRef<SVGSVGElement, IconProps>(
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
        d="M2.5 13.5h4.25V15H2a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h4.75v1.5H2.5zm9.94-6.25-1.97-1.97-.53-.53L11 3.69l.53.53 3.074 3.073a1 1 0 0 1 0 1.414L11.53 11.78l-.53.53-1.06-1.06.53-.53 1.97-1.97H5v-1.5h7.44"
        clipRule="evenodd"
      />
    </svg>
  ),
);
Logout.displayName = "Logout";

export { Logout };
export default Logout;
