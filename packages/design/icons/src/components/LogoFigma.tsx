import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const LogoFigma = forwardRef<SVGSVGElement, IconProps>(
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
      <path fill="#1ABCFE" d="M8.003 8a2.667 2.667 0 1 1 5.334 0 2.667 2.667 0 0 1-5.334 0" />
      <path
        fill="#0ACF83"
        d="M2.67 13.333a2.667 2.667 0 0 1 2.667-2.666h2.666v2.666a2.666 2.666 0 1 1-5.333 0"
      />
      <path fill="#FF7262" d="M8.003 0v5.333h2.667a2.667 2.667 0 0 0 0-5.333z" />
      <path
        fill="#F24E1E"
        d="M2.67 2.667a2.667 2.667 0 0 0 2.667 2.666h2.667V0H5.337A2.667 2.667 0 0 0 2.67 2.667"
      />
      <path
        fill="#A259FF"
        d="M2.67 8a2.667 2.667 0 0 0 2.667 2.667h2.666V5.333H5.337A2.667 2.667 0 0 0 2.67 8"
      />
    </svg>
  ),
);
LogoFigma.displayName = "LogoFigma";

export { LogoFigma };
export default LogoFigma;
