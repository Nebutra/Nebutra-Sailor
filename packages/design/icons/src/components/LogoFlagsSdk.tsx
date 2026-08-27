import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const LogoFlagsSdk = forwardRef<SVGSVGElement, IconProps>(
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
        d="M4 0a4 4 0 0 0-4 4v8a4 4 0 0 0 4 4h8a4 4 0 0 0 4-4V4a4 4 0 0 0-4-4zm2.5 9.75c-1.25 0-2 .75-2 .75V6s.75-.75 2-.75 1.75 1 3 1 2-.625 2-.625v4.5s-.75.625-2 .625-1.75-1-3-1"
        clipRule="evenodd"
      />
    </svg>
  ),
);
LogoFlagsSdk.displayName = "LogoFlagsSdk";

export { LogoFlagsSdk };
export default LogoFlagsSdk;
