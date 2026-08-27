import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const LogoVercelApi = forwardRef<SVGSVGElement, IconProps>(
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
      <g clipPath="url(#clip0_872_3535)">
        <path
          fill="transparent"
          fillRule="evenodd"
          stroke="currentColor"
          strokeDasharray="1.25 1.25"
          strokeWidth={1.25}
          d="m8 2 7 12.5H1z"
          clipRule="evenodd"
        />
      </g>
      <defs>
        <clipPath id="clip0_872_3535">
          <path fill="#fff" d="M0 0h16v16H0z" />
        </clipPath>
      </defs>
    </svg>
  ),
);
LogoVercelApi.displayName = "LogoVercelApi";

export { LogoVercelApi };
export default LogoVercelApi;
