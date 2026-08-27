import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const AcronymTs = forwardRef<SVGSVGElement, IconProps>(
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
        d="M0 2.5A2.5 2.5 0 0 1 2.5 0h11A2.5 2.5 0 0 1 16 2.5v11a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 0 13.5zm12.125 7a.375.375 0 0 0 0 .75 1.875 1.875 0 0 1 0 3.75H10.5v-1.5h1.625a.375.375 0 0 0 0-.75 1.875 1.875 0 0 1 0-3.75H13.5v1.5zM5 9.5h1.25V14h1.5V9.5H9V8H5z"
        clipRule="evenodd"
      />
    </svg>
  ),
);
AcronymTs.displayName = "AcronymTs";

export { AcronymTs };
export default AcronymTs;
