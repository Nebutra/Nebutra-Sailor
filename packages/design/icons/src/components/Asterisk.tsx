import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const Asterisk = forwardRef<SVGSVGElement, IconProps>(
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
        d="M7.25 15v-3.969a1 1 0 0 0-1.5-.866L2.313 12.15l-.75-1.3L5 8.867a1 1 0 0 0 0-1.732L1.563 5.15l.75-1.3L5.75 5.835a1 1 0 0 0 1.5-.866V1h1.5v3.969a1 1 0 0 0 1.5.866l3.437-1.985.75 1.3L11 7.134a1 1 0 0 0 0 1.732l3.437 1.985-.75 1.298-3.437-1.984a1 1 0 0 0-1.5.866V15z"
        clipRule="evenodd"
      />
    </svg>
  ),
);
Asterisk.displayName = "Asterisk";

export { Asterisk };
export default Asterisk;
