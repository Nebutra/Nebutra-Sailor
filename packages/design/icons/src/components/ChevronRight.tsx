import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const ChevronRight = forwardRef<SVGSVGElement, IconProps>(
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
        d="m5.5 1.94.53.53 4.824 4.823a1 1 0 0 1 0 1.414L6.03 13.53l-.53.53L4.44 13l.53-.53L9.44 8 4.97 3.53 4.44 3z"
        clipRule="evenodd"
      />
    </svg>
  ),
);
ChevronRight.displayName = "ChevronRight";

export { ChevronRight };
export default ChevronRight;
