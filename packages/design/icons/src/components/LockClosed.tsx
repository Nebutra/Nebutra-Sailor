import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const LockClosed = forwardRef<SVGSVGElement, IconProps>(
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
        d="M10 4.5V6H6V4.5a2 2 0 1 1 4 0M4.5 6V4.5a3.5 3.5 0 1 1 7 0V6H14v6.5a2.5 2.5 0 0 1-2.5 2.5h-7A2.5 2.5 0 0 1 2 12.5V6h2.5m7 1.5h-8v5a1 1 0 0 0 1 1h7a1 1 0 0 0 1-1v-5z"
        clipRule="evenodd"
      />
    </svg>
  ),
);
LockClosed.displayName = "LockClosed";

export { LockClosed };
export default LockClosed;
