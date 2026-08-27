import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const ArrowLeft = forwardRef<SVGSVGElement, IconProps>(
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
        d="m6.47 13.78.53.53 1.06-1.06-.53-.53-3.97-3.97H15v-1.5H3.56l3.97-3.97.53-.53L7 1.69l-.53.53-5.074 5.073a1 1 0 0 0 0 1.414z"
        clipRule="evenodd"
      />
    </svg>
  ),
);
ArrowLeft.displayName = "ArrowLeft";

export { ArrowLeft };
export default ArrowLeft;
