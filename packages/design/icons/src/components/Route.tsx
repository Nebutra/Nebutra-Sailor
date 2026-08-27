import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const Route = forwardRef<SVGSVGElement, IconProps>(
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
        d="M7.53.72 7 .19 5.94 1.25l.53.53.22.22H3.374a3.375 3.375 0 0 0 0 6.75h9.25a1.875 1.875 0 0 1 0 3.75h-7.74a2.501 2.501 0 1 0 0 1.5h7.74a3.375 3.375 0 1 0 0-6.75h-9.25a1.875 1.875 0 0 1 0-3.75h3.314l-.22.22-.53.53L7 5.31l.53-.53 1.324-1.323a1 1 0 0 0 0-1.414zM2.5 14.25a1 1 0 1 0 0-2 1 1 0 0 0 0 2m12-11.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0m1.5 0a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0"
        clipRule="evenodd"
      />
    </svg>
  ),
);
Route.displayName = "Route";

export { Route };
export default Route;
