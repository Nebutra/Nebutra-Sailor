import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const FirewallCheck = forwardRef<SVGSVGElement, IconProps>(
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
      <g clipPath="url(#clip0_4629_2028)">
        <path
          fill="currentColor"
          fillRule="evenodd"
          d="M0 1.25C0 .56.56 0 1.25 0h13.5C15.44 0 16 .56 16 1.25V5.5H6v4H1.5V12h3v1.5H1.25C.56 13.5 0 12.94 0 12.25zM1.5 8h3V5.5h-3zm3-4h-3V1.5h3zM6 1.5V4h4V1.5zM14.5 4h-3V1.5h3zm1.5 7.5a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0m-1.714-1.137-.442.442-2.603 2.603a.875.875 0 0 1-1.238 0l-.847-.847-.442-.442.884-.884.442.442.582.582 2.338-2.338.442-.442z"
          clipRule="evenodd"
        />
      </g>
      <defs>
        <clipPath id="clip0_4629_2028">
          <path fill="#fff" d="M0 0h16v16H0z" />
        </clipPath>
      </defs>
    </svg>
  ),
);
FirewallCheck.displayName = "FirewallCheck";

export { FirewallCheck };
export default FirewallCheck;
