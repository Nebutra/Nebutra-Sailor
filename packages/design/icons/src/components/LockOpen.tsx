import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const LockOpen = forwardRef<SVGSVGElement, IconProps>(
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
        d="M14 6V4.5a2 2 0 1 0-4 0V6h2v6.5A2.5 2.5 0 0 1 9.5 15h-7A2.5 2.5 0 0 1 0 12.5V6h8.5V4.5a3.5 3.5 0 1 1 7 0V6zm-3.5 1.5h-9v5a1 1 0 0 0 1 1h7a1 1 0 0 0 1-1z"
        clipRule="evenodd"
      />
    </svg>
  ),
);
LockOpen.displayName = "LockOpen";

export { LockOpen };
export default LockOpen;
