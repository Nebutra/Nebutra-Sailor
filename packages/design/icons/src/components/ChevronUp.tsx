import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const ChevronUp = forwardRef<SVGSVGElement, IconProps>(
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
        d="m1.94 10.5.53-.53 4.823-4.824a1 1 0 0 1 1.414 0L13.53 9.97l.53.53L13 11.56l-.53-.53L8 6.56l-4.47 4.47-.53.53z"
        clipRule="evenodd"
      />
    </svg>
  ),
);
ChevronUp.displayName = "ChevronUp";

export { ChevronUp };
export default ChevronUp;
