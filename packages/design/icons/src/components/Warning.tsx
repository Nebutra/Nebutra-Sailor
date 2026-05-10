import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const Warning = forwardRef<SVGSVGElement, IconProps>(
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
        d="M8.558 2H7.441L1.89 13.5h12.22zm1.351-.652A1.5 1.5 0 0 0 8.56.5H7.44a1.5 1.5 0 0 0-1.35.848L.193 13.565a1 1 0 0 0 .9 1.435h13.814a1 1 0 0 0 .9-1.435zM8.75 4.75v4h-1.5v-4zM8 12a1 1 0 1 0 0-2 1 1 0 0 0 0 2"
        clipRule="evenodd"
      />
    </svg>
  ),
);
Warning.displayName = "Warning";

export { Warning };
export default Warning;
