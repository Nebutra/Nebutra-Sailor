import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const ArrowUpRightSmall = forwardRef<SVGSVGElement, IconProps>(
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
        d="M6.75 4H6v1.5h3.44L5.47 9.47l-.53.53L6 11.06l.53-.53L10.5 6.562V10h1.5V5a1 1 0 0 0-1-1z"
        clipRule="evenodd"
      />
    </svg>
  ),
);
ArrowUpRightSmall.displayName = "ArrowUpRightSmall";

export { ArrowUpRightSmall };
export default ArrowUpRightSmall;
