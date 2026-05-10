import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const LogoBluesky = forwardRef<SVGSVGElement, IconProps>(
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
        fill="#1185FE"
        d="M3.47 1.95A19 19 0 0 1 8 7.62c.73-1.5 2.7-4.3 4.53-5.67C13.86.95 16 .19 16 2.63c0 .5-.28 4.1-.44 4.7-.58 2.03-2.66 2.55-4.5 2.24 3.23.55 4.05 2.38 2.27 4.2-3.37 3.46-4.85-.87-5.23-1.98q-.1-.32-.1-.22 0-.1-.1.22c-.38 1.11-1.86 5.44-5.23 1.98-1.78-1.82-.96-3.65 2.28-4.2C3.1 9.89 1 9.37.45 7.32A48 48 0 0 1 0 2.63C0 .2 2.15.96 3.47 1.95"
      />
    </svg>
  ),
);
LogoBluesky.displayName = "LogoBluesky";

export { LogoBluesky };
export default LogoBluesky;
