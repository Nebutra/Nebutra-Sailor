import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const Linked = forwardRef<SVGSVGElement, IconProps>(
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
        d="M4.25 1.5A4.25 4.25 0 0 0 .995 8.482l1.148-.964A2.75 2.75 0 0 1 4.25 3H8.5a2.75 2.75 0 1 1 0 5.5V10a4.25 4.25 0 0 0 0-8.5zm7.5 11.5H7.5a2.75 2.75 0 1 1 0-5.5V6a4.25 4.25 0 0 0 0 8.5h4.25a4.25 4.25 0 0 0 3.255-6.982l-1.148.964A2.75 2.75 0 0 1 11.75 13"
        clipRule="evenodd"
      />
    </svg>
  ),
);
Linked.displayName = "Linked";

export { Linked };
export default Linked;
