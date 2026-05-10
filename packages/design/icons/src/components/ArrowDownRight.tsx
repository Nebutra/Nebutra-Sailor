import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const ArrowDownRight = forwardRef<SVGSVGElement, IconProps>(
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
        d="M12.5 11.44V5H14v8a1 1 0 0 1-1 1H5v-1.5h6.438L2.219 3.28l-.53-.53 1.06-1.06.53.53z"
        clipRule="evenodd"
      />
    </svg>
  ),
);
ArrowDownRight.displayName = "ArrowDownRight";

export { ArrowDownRight };
export default ArrowDownRight;
