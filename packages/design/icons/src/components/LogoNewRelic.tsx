import type * as React from "react";
import { forwardRef } from "react";
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Icon size in px (default: 16). Overrides width/height props. */
  size?: number | string;
}
const LogoNewRelic = forwardRef<SVGSVGElement, IconProps>(
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
        fill="#00AC69"
        d="M12.261 5.539v4.922l-4.262 2.462V16l6.928-4V4z"
        style={{
          fill: "color(display-p3 0 .6745 .4118)",
          fillOpacity: 1,
        }}
      />
      <path
        fill="#1CE783"
        d="m7.999 3.078 4.262 2.46L14.928 4l-6.93-4L1.07 4l2.665 1.539z"
        style={{
          fill: "color(display-p3 .1098 .9059 .5137)",
          fillOpacity: 1,
        }}
      />
      <path
        fill="#1D252C"
        d="M5.334 9.54v4.922L7.999 16V8L1.07 4v3.078z"
        style={{
          fill: "color(display-p3 .1137 .1451 .1725)",
          fillOpacity: 1,
        }}
      />
    </svg>
  ),
);
LogoNewRelic.displayName = "LogoNewRelic";

export { LogoNewRelic };
export default LogoNewRelic;
