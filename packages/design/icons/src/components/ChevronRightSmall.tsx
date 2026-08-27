import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const ChevronRightSmall = forwardRef<SVGSVGElement, IconProps>(
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
        d="m6.75 3.94.53.53 2.824 2.823a1 1 0 0 1 0 1.414L7.28 11.53l-.53.53L5.69 11l.53-.53L8.69 8 6.22 5.53 5.69 5z"
        clipRule="evenodd"
      />
    </svg>
  ),
);
ChevronRightSmall.displayName = "ChevronRightSmall";

export { ChevronRightSmall };
export default ChevronRightSmall;
