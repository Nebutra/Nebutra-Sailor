import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const ArrowLeftRight = forwardRef<SVGSVGElement, IconProps>(
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
        d="m3.47 11.78.53.53 1.06-1.06-.53-.53-1.97-1.97h10.88l-1.97 1.97-.53.53L12 12.31l.53-.53 3.074-3.073a1 1 0 0 0 0-1.414L12.53 4.22 12 3.69l-1.06 1.06.53.53 1.97 1.97H2.56l1.97-1.97.53-.53L4 3.69l-.53.53L.397 7.293a1 1 0 0 0 0 1.414z"
        clipRule="evenodd"
      />
    </svg>
  ),
);
ArrowLeftRight.displayName = "ArrowLeftRight";

export { ArrowLeftRight };
export default ArrowLeftRight;
