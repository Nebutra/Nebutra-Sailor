import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const Backspace = forwardRef<SVGSVGElement, IconProps>(
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
        d="M0 .75V0h1.5v16H0V.75m8.47 2.47L9 2.69l1.06 1.06-.53.53-2.97 2.97H16v1.5H6.56l2.97 2.97.53.53L9 13.31l-.53-.53-4.25-4.25a.75.75 0 0 1 0-1.06z"
        clipRule="evenodd"
      />
    </svg>
  ),
);
Backspace.displayName = "Backspace";

export { Backspace };
export default Backspace;
