import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const WarningFill = forwardRef<SVGSVGElement, IconProps>(
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
        d="M8.558.5c.576 0 1.101.33 1.351.848l5.898 12.217a1 1 0 0 1-.9 1.435H1.093a1 1 0 0 1-.9-1.435L6.09 1.348A1.5 1.5 0 0 1 7.44.5zm.192 4.25v4h-1.5v-4zM8 12a1 1 0 1 0 0-2 1 1 0 0 0 0 2"
        clipRule="evenodd"
      />
    </svg>
  ),
);
WarningFill.displayName = "WarningFill";

export { WarningFill };
export default WarningFill;
