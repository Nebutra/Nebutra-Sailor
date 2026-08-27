import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const LogoLinkedinSmall = forwardRef<SVGSVGElement, IconProps>(
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
        d="M3.5 2A1.5 1.5 0 0 0 2 3.5v9A1.5 1.5 0 0 0 3.5 14h9a1.5 1.5 0 0 0 1.5-1.5v-9A1.5 1.5 0 0 0 12.5 2zm1.246 3.5c.465 0 .754-.333.754-.75-.009-.426-.29-.75-.746-.75S4 4.324 4 4.75c0 .417.29.75.737.75zm.754 1V12H4V6.5zM7 12h1.5V8.895S8.604 7.79 9.552 7.79s.948 1.233.948 1.233V12H12V8.813c0-1.675-.75-2.31-1.875-2.31S8.5 7.278 8.5 7.278v-.775H7C7.024 7.014 7 12 7 12"
        clipRule="evenodd"
      />
    </svg>
  ),
);
LogoLinkedinSmall.displayName = "LogoLinkedinSmall";

export { LogoLinkedinSmall };
export default LogoLinkedinSmall;
