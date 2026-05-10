import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const ChevronDownSmall = forwardRef<SVGSVGElement, IconProps>(
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
        d="m12.06 6.75-.53.53-2.823 2.824a1 1 0 0 1-1.414 0L4.47 7.28l-.53-.53L5 5.69l.53.53L8 8.69l2.47-2.47.53-.53z"
        clipRule="evenodd"
      />
    </svg>
  ),
);
ChevronDownSmall.displayName = "ChevronDownSmall";

export { ChevronDownSmall };
export default ChevronDownSmall;
