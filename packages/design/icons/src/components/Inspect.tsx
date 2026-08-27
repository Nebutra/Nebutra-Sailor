import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const Inspect = forwardRef<SVGSVGElement, IconProps>(
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
        d="M4.75 13.5H2.5v-11h11v3H15V2a1 1 0 0 0-1-1H2a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h3.5v-1.5zm2.75-.075V8.501a1 1 0 0 1 1-1h4.925V9H10.06l4.969 4.969.53.53-1.06 1.06-.53-.53L9 10.061v3.364z"
        clipRule="evenodd"
      />
    </svg>
  ),
);
Inspect.displayName = "Inspect";

export { Inspect };
export default Inspect;
