import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const LogoLaunchdarkly = forwardRef<SVGSVGElement, IconProps>(
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
        d="M8.117 14.966a.32.32 0 0 1-.276-.173.29.29 0 0 1 .028-.312l3.273-4.507-5.734 2.345a.3.3 0 0 1-.306-.035.3.3 0 0 1-.11-.159.296.296 0 0 1 .13-.337l5.039-2.976-8.875-.51a.304.304 0 0 1 0-.607l8.88-.51L5.123 4.21a.296.296 0 0 1-.126-.337.307.307 0 0 1 .416-.194l5.73 2.346-3.272-4.506a.3.3 0 0 1-.029-.313.31.31 0 0 1 .278-.172.3.3 0 0 1 .212.092l6.524 6.523a.496.496 0 0 1 0 .7L8.33 14.874a.3.3 0 0 1-.213.091"
      />
    </svg>
  ),
);
LogoLaunchdarkly.displayName = "LogoLaunchdarkly";

export { LogoLaunchdarkly };
export default LogoLaunchdarkly;
