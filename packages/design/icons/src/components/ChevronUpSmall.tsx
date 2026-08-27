import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const ChevronUpSmall = forwardRef<SVGSVGElement, IconProps>(
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
        d="m3.94 9.25.53-.53 2.823-2.824a1 1 0 0 1 1.414 0L11.53 8.72l.53.53L11 10.31l-.53-.53L8 7.31 5.53 9.78l-.53.53z"
        clipRule="evenodd"
      />
    </svg>
  ),
);
ChevronUpSmall.displayName = "ChevronUpSmall";

export { ChevronUpSmall };
export default ChevronUpSmall;
