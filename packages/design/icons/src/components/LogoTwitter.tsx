import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const LogoTwitter = forwardRef<SVGSVGElement, IconProps>(
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
        fill="#449AEA"
        d="M5.032 15c6.037 0 9.34-5.387 9.34-10.058 0-.153 0-.305-.01-.457A7 7 0 0 0 16 2.655c-.6.286-1.235.474-1.885.556a3.5 3.5 0 0 0 1.443-1.955 6.3 6.3 0 0 1-2.085.858 3.22 3.22 0 0 0-1.862-1.067 3.08 3.08 0 0 0-2.082.372 3.45 3.45 0 0 0-1.442 1.658 3.8 3.8 0 0 0-.208 2.261 8.8 8.8 0 0 1-3.747-1.072 9.5 9.5 0 0 1-3.018-2.621c-.42.778-.549 1.7-.36 2.576A3.55 3.55 0 0 0 2.13 6.364 3.1 3.1 0 0 1 .64 5.92v.045c0 .816.263 1.607.743 2.239a3.25 3.25 0 0 0 1.89 1.226 3.05 3.05 0 0 1-1.482.061c.21.702.619 1.317 1.168 1.757.55.44 1.214.684 1.9.698-1.163.984-2.6 1.518-4.078 1.516a6 6 0 0 1-.781-.05 8.8 8.8 0 0 0 5.032 1.584"
      />
    </svg>
  ),
);
LogoTwitter.displayName = "LogoTwitter";

export { LogoTwitter };
export default LogoTwitter;
