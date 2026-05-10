import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const CrossSmall = forwardRef<SVGSVGElement, IconProps>(
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
        d="m9.97 11.03.53.53 1.06-1.06-.53-.53L9.06 8l1.97-1.97.53-.53-1.06-1.06-.53.53L8 6.94 6.03 4.97l-.53-.53L4.44 5.5l.53.53L6.94 8 4.97 9.97l-.53.53 1.06 1.06.53-.53L8 9.06z"
        clipRule="evenodd"
      />
    </svg>
  ),
);
CrossSmall.displayName = "CrossSmall";

export { CrossSmall };
export default CrossSmall;
