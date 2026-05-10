import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const LogoGithubSmall = forwardRef<SVGSVGElement, IconProps>(
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
        d="M8 1.463A6.497 6.497 0 0 0 1.5 7.96a6.49 6.49 0 0 0 4.444 6.165c.325.057.447-.138.447-.309 0-.154-.008-.666-.008-1.21-1.633.3-2.056-.398-2.185-.763-.074-.187-.39-.764-.667-.918-.227-.122-.552-.422-.008-.43.512-.009.878.47 1 .666.585.982 1.519.706 1.893.536.056-.423.227-.707.414-.87-1.446-.162-2.957-.722-2.957-3.208 0-.706.251-1.291.666-1.746-.065-.163-.293-.829.065-1.722 0 0 .544-.17 1.787.666a6 6 0 0 1 1.625-.22c.553 0 1.105.074 1.625.22 1.243-.845 1.788-.666 1.788-.666.357.893.13 1.56.065 1.722.414.455.666 1.031.666 1.746 0 2.494-1.52 3.046-2.966 3.209.236.203.44.592.44 1.202 0 .869-.009 1.567-.009 1.787 0 .17.122.373.447.308A6.51 6.51 0 0 0 14.5 7.96 6.497 6.497 0 0 0 8 1.463"
        clipRule="evenodd"
      />
    </svg>
  ),
);
LogoGithubSmall.displayName = "LogoGithubSmall";

export { LogoGithubSmall };
export default LogoGithubSmall;
