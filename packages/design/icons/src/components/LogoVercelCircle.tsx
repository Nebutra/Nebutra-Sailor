import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const LogoVercelCircle = forwardRef<SVGSVGElement, IconProps>(
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
      <g clipPath="url(#clip0_872_3186)">
        <circle
          cx={8}
          cy={8}
          r={7.25}
          fill="currentColor"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth={1.5}
        />
        <path
          fill="var(--ds-gray-100)"
          fillRule="evenodd"
          d="m8 4.5 3.5 6.125h-7z"
          clipRule="evenodd"
        />
      </g>
      <defs>
        <clipPath id="clip0_872_3186">
          <path fill="#fff" d="M0 0h16v16H0z" />
        </clipPath>
      </defs>
    </svg>
  ),
);
LogoVercelCircle.displayName = "LogoVercelCircle";

export { LogoVercelCircle };
export default LogoVercelCircle;
