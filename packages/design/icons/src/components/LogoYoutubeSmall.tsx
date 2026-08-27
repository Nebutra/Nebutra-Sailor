import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const LogoYoutubeSmall = forwardRef<SVGSVGElement, IconProps>(
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
        d="M13.47 3.393a1.75 1.75 0 0 1 1.237 1.237C15 5.722 15 8 15 8s0 2.279-.293 3.37a1.75 1.75 0 0 1-1.238 1.238C12.38 12.9 8 12.9 8 12.9s-4.378 0-5.47-.292a1.75 1.75 0 0 1-1.237-1.238C1 10.279 1 8 1 8s0-2.278.293-3.37A1.75 1.75 0 0 1 2.53 3.393C3.622 3.1 8 3.1 8 3.1s4.378 0 5.47.293M10.236 8 6.6 10.1V5.9z"
        clipRule="evenodd"
      />
    </svg>
  ),
);
LogoYoutubeSmall.displayName = "LogoYoutubeSmall";

export { LogoYoutubeSmall };
export default LogoYoutubeSmall;
